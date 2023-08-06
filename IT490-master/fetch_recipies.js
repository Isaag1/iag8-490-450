const axios = require('axios');
const fs = require('fs');

const options = {
  method: 'GET',
  url: 'https://tasty.p.rapidapi.com/recipes/list',
  params: {
    from: '0',
    size: '15',
    tags: 'under_30_minutes'
  },
  headers: {
    'X-RapidAPI-Key': 'faba577796msh94cf14efd16e651p179b74jsnc6aa55a38e03',
    'X-RapidAPI-Host': 'tasty.p.rapidapi.com'
  }
};

async function fetchRecipesAndSaveToFile() {
  try {
    const response = await axios.request(options);
    const results = response.data.results;

    const simplifiedResults = results.map((recipe) => {
      const {
        id,
        name,
        thumbnail_url,
        instructions,
        nutrition,
        tags
      } = recipe;

      // Extract ingredients
      let ingredients = [];
      if (recipe.sections && recipe.sections.length > 0 && recipe.sections[0].components) {
        ingredients = recipe.sections[0].components.map((component) => {
          if (component.ingredient && component.ingredient.name) {
            // Exclude "updated_at" from ingredient properties
            const { updated_at, ...ingredient } = component.ingredient;
            return ingredient;
          }
          return '';
        });
      }

      return {
        id,
        name,
        photo: thumbnail_url,
        ingredients,
        steps: instructions.map((step) => step.display_text),
        nutrition,
        tags: tags.map((tag) => tag.name)
      };
    });

    const jsonData = JSON.stringify(simplifiedResults, null, 2);
    fs.writeFile('selected_recipes.json', jsonData, 'utf8', (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('Data written to selected_recipes.json');
      }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

fetchRecipesAndSaveToFile();


