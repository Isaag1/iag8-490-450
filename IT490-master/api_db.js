const amqp = require('amqplib');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '35.219.141.161',
  user: 'nv288',
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
      apiData.forEach(async (recipeData) => {
        const { api_id, name, photo, tags, ingredientList, steps, nutrition, ingredients } = recipeData;

        // Extract the integer value from api_id
        const apiIdInteger = parseInt(api_id.split(':')[1]);

        const recipeId = await insertRecipe(apiIdInteger, name, photo, tags, ingredientList, steps, nutrition); // Insert the recipe and get the recipeId

        // Insert ingredients into the Ingredients table
        await insertIngredients(recipeId, ingredients);
      });
    } else {
      console.error('No valid recipe data found in the received message');
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
}

async function insertIngredients(recipeId, ingredients) {
  const insertIngredientQuery = `
    INSERT INTO Ingredients (name) 
    VALUES (?)
  `;

  for (const ingredient of ingredients) {
    try {
      await db.execute(insertIngredientQuery, [ingredient]);
      console.log('Ingredient inserted successfully:', ingredient);
    } catch (error) {
      console.error('Error inserting ingredient:', error);
    }
  }
}

async function insertRecipe(apiId, name, photo, tags, ingredientList, steps, nutrition) {
  const checkQuery = `
    SELECT id FROM Recipes WHERE api_id = ?
  `;

  const [rows] = await db.execute(checkQuery, [apiId]);

  if (rows.length > 0) {
    console.log('Recipe already exists:', apiId);
    return rows[0].id;
  }

  const insertQuery = `
    INSERT INTO Recipes (api_id, name, photo, tags, ingredientList, steps, nutrition) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.execute(insertQuery, [apiId, name, photo, tags, JSON.stringify(ingredientList), JSON.stringify(steps), JSON.stringify(nutrition)]);

  return result.insertId; // Return the inserted recipe's ID
}

setup();
