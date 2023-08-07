const amqp = require('amqplib');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '35.219.141.161',
  user:	'nv288',
  password: 'titans',
  database: 'titans'
};

let db;

async function setup() {
  db = await mysql.createConnection(DB_CONFIG);

  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const queueName = 'api_data_queue';
  await channel.assertQueue(queueName, { durable: true });

  console.log('Waiting for messages in the queue...');

  channel.consume(queueName, handleMessage, { noAck: true });
}

async function handleMessage(msg) {
  try {
    const apiData = JSON.parse(msg.content.toString());

    if (Array.isArray(apiData)) {
      apiData.forEach((recipeData) => {
        const { api_id, ingredientList, steps, nutrition } = recipeData;

        // Extract the integer value from api_id
        const apiIdInteger = parseInt(api_id.split(':')[1]);

        insertRecipe(apiIdInteger, ingredientList, steps, nutrition);
      });
    } else {
      console.error('No valid recipe data found in the received message');
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

function insertRecipe(apiId, ingredientList, steps, nutrition) {
  const insertQuery = `
    INSERT INTO Recipes (api_id, ingredientList, steps, nutrition)
    VALUES (?, ?, ?, ?)
  `;

  db.execute(insertQuery, [apiId, JSON.stringify(ingredientList), JSON.stringify(steps), JSON.stringify(nutrition)])
    .then(() => {
      console.log('Recipe data inserted successfully:', apiId);
    })
    .catch((error) => {
      console.error('Error inserting data:', error);
    });
}

setup();
