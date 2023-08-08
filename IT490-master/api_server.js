const axios = require('axios');
const amqp = require('amqplib');

const API_OPTIONS = {
  method: 'GET',
  url: 'https://tasty.p.rapidapi.com/recipes/list',
  params: {
    from: '0',
    size: '2',
    tags: 'few ingredients'
  },
  headers: {
    'X-RapidAPI-Key': 'faba577796msh94cf14efd16e651p179b74jsnc6aa55a38e03',
    'X-RapidAPI-Host': 'tasty.p.rapidapi.com'
  }
};

const BROKER_HOST = '127.0.0.1';
const BROKER_PORT = 5672;
const USER = 'guest';
const PASSWORD = 'guest';

async function fetchDataAndSendToQueue() {
  const connection = await amqp.connect(`amqp://${USER}:${PASSWORD}@${BROKER_HOST}:${BROKER_PORT}`);
  const channel = await connection.createChannel();

  try {
    const response = await axios.request(API_OPTIONS);
    const data = response.data.results;

    const formattedData = data.map(recipe => ({
      api_id: recipe.canonical_id,
      name: recipe.name,
      photo: recipe.thumbnail_url,
      tags: recipe.keywords,
      ingredientList: recipe.sections[0].components.map(component => component.raw_text),
      steps: recipe.instructions.map(instruction => instruction.display_text),
      nutrition: recipe.nutrition,
      ingredients: recipe.sections[0].components.map(component => component.ingredient.name),
      created: new Date().toISOString(),
      modified: new Date(recipe.updated_at).toISOString()
    }));

    channel.assertQueue('api_data_queue');
    channel.sendToQueue('api_data_queue', Buffer.from(JSON.stringify(formattedData)));

    console.log('Data sent to queue:', formattedData);
  } catch (error) {
    console.error('API request error:', error);
  } finally {
    setTimeout(async () => {
      await channel.close();
      await connection.close();
    }, 1000);
  }
}

fetchDataAndSendToQueue().catch(console.error);
