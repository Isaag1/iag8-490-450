const axios = require('axios');
const fs = require('fs');
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: '35.219.141.161',
  user: 'nv288',
  password: 'titans',
  database: 'titans',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const options = {
  method: 'GET',
  url: 'https://tasty.p.rapidapi.com/recipes/list',
  params: {
    from: '0',
    size: '2',
    tags: 'under_30_minutes'
  },
  headers: {
    'X-RapidAPI-Key': 'faba577796msh94cf14efd16e651p179b74jsnc6aa55a38e03',
    'X-RapidAPI-Host': 'tasty.p.rapidapi.com'
  }
};

async function fetchRecipesAndSaveToDatabase() {
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
            return component.ingredient.name;
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

    simplifiedResults.forEach((recipe) => {
      const recipeQuery = `
        INSERT INTO Recipes (api_id, name, photo, ingredientList, steps, TAGS, created, modified)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      const recipeValues = [
        recipe.id,
        recipe.name,
        recipe.photo,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.steps),
        JSON.stringify(recipe.tags)
      ];

      pool.query(recipeQuery, recipeValues, (error, results, fields) => {
        if (error) {
          console.error('Error inserting recipe:', error);
        } else {
          console.log('Recipe inserted successfully.');
        }
      });
    });

    const ingredientsData = fs.readFileSync('ingredients.json', 'utf8');
    const ingredientList = JSON.parse(ingredientsData);

    ingredientList.forEach((ingredients, index) => {
      const ingredientQuery = `
        INSERT INTO Ingredients (id, name, created, modified)
        VALUES (?, ?, NOW(), NOW())
      `;
      const ingredientValues = [index + 1, JSON.stringify(ingredients)];

      pool.query(ingredientQuery, ingredientValues, (error, results, fields) => {
        if (error) {
          console.error('Error inserting ingredient:', error);
        } else {
          console.log('Ingredient inserted successfully.');
        }
      });
    });

  } catch (error) {
    console.error(error);
  }
}

fetchRecipesAndSaveToDatabase();
