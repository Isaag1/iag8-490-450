const amqp = require('amqplib');
const mysql = require('mysql');

async function consumeQueueAndInsertIntoDatabase() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  try {
    channel.assertQueue('api_data_queue');
    channel.consume('api_data_queue', (msg) => {
      const data = JSON.parse(msg.content.toString());

      const dbConnection = mysql.createConnection({
        host: 'localhost',
        user: 'your_db_user',
        password: 'your_db_password',
        database: 'your_db_name',
      });

      dbConnection.connect();
      // Assuming you have a 'recipes' table in your database
      dbConnection.query('INSERT INTO recipes SET ?', data, (error, results) => {
        if (error) throw error;
        console.log('Data inserted:', results);
      });

      dbConnection.end();
      channel.ack(msg); // Acknowledge the message
    });
  } catch (error) {
    console.error('Queue consumer error:', error);
  }
}

consumeQueueAndInsertIntoDatabase().catch(console.error);
