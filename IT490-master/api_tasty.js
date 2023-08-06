const fs = require('fs');
const axios = require('axios');
const mysql = require('mysql2/promise'); // Import mysql2/promise

const pool = mysql.createPool({
  host: '35.219.141.161',
  user: 'nv288',
  password: 'titans',
  database: 'titans',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function fetchRecipesAndSaveToDatabase() {
  const options = {
    method: 'GET',
    url: 'https://tasty.p.rapidapi.com/recipes/list',
    params: {
      from: '0',
      size: '20',
      tags: 'under_30_minutes'
    },
    headers: {
      'X-RapidAPI-Key': 'faba577796msh94cf14efd16e651p179b74jsnc6aa55a38e03',
      'X-RapidAPI-Host': 'tasty.p.rapidapi.com'
    }
  };

  try {
    const response = await axios.request(options);
    const simplifiedResults = response.data.results.map((recipe) => {
      const steps = recipe.instructions ? recipe.instructions.map((step) => step.display_text) : [];
      const ingredients = [];
      const ingredientList = []; // New array to store raw_text values

      for (const section of recipe.sections) {
        for (const component of section.components) {
          if (component.raw_text) { // Add raw_text to ingredientList array
            ingredientList.push(component.raw_text);
          }
          if (component.ingredient) { // Check if there is an ingredient object
            const ingredientName = component.ingredient.name;
            ingredients.push(ingredientName);
          }
        }
      }

      return {
        id: recipe.id,
        name: recipe.name,
        photo: recipe.thumbnail_url,
        ingredients: ingredients,
        steps: steps,
        nutrition: recipe.nutrition,
        tags: recipe.tags ? recipe.tags.map((tag) => tag.name) : [],
        ingredientList: ingredientList // Add the new ingredientList field
      };
    });

    const jsonData = JSON.stringify(simplifiedResults, null, 2);

    fs.writeFile('selected_recipes.json', jsonData, 'utf8', (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log('Successfully saved recipes to file.');
      }
    });

    for (const recipe of simplifiedResults) {
      const sql = `
        INSERT INTO Recipes (api_id, name, photo, ingredientList, steps, nutrition, TAGS, created, modified)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        photo = VALUES(photo),
        ingredientList = VALUES(ingredientList),
        steps = VALUES(steps),
        nutrition = VALUES(nutrition),
        TAGS = VALUES(TAGS),
        modified = NOW();
      `;

      const values = [
        recipe.id,
        recipe.name,
        recipe.photo,
        JSON.stringify(recipe.ingredientList), // Use the new ingredientList field
        JSON.stringify(recipe.steps),
        JSON.stringify(recipe.nutrition),
        JSON.stringify(recipe.tags)
      ];

      try {
        const connection = await pool.getConnection();
        await connection.query(sql, values);
        connection.release();
        console.log(`Recipe with ID ${recipe.id} inserted into the database.`);
      } catch (error) {
        console.error(`Error inserting recipe with ID ${recipe.id}:`, error);
      }
    }

    console.log('Successfully saved recipes to database.');
  } catch (err) {
    console.error(err);
  }
}

fetchRecipesAndSaveToDatabase();
