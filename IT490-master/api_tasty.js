const axios = require('axios');
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: '35.219.141.161',
  user: 'nv288',
  password: 'titans',
  database: 'titans',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function fetchRecipesAndSaveToDatabase() {
  const options = {
    method: 'GET',
    url: 'https://tasty.p.rapidapi.com/recipes/list',
    params: {
      from: '0',
      size: '1',
      tags: 'under_30_minutes',
    },
    headers: {
      'X-RapidAPI-Key': 'faba577796msh94cf14efd16e651p179b74jsnc6aa55a38e03',
      'X-RapidAPI-Host': 'tasty.p.rapidapi.com',
    },
  };

  try {
    const response = await axios.request(options);
    console.log('API Response:', response.data); // Debug output

    const simplifiedResults = response.data.results.map((recipe) => {
      console.log('Recipe:', recipe); // Debug output
      // ... (your data processing logic)
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
        recipe.id,        // <-- This is where the error occurs if 'id' is undefined
        recipe.name,
        recipe.photo,
        JSON.stringify(recipe.ingredients),
        JSON.stringify(recipe.steps),
        JSON.stringify(recipe.nutrition),
        JSON.stringify(recipe.tags),
      ];

      try {
        const connection = await pool.getConnection();
        await connection.query(sql, values);
        connection.release();
        console.log(`Recipe with ID ${recipe.id} inserted into the database.`);

        // Insert ingredients into Ingredients table
        for (const ingredient of recipe.ingredients) {
          const insertIngredientSql = `
            INSERT INTO Ingredients (name, created, modified)
            VALUES (?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE
            modified = NOW();
          `;

          try {
            await connection.query(insertIngredientSql, [ingredient]);
            console.log(`Ingredient "${ingredient}" inserted into the Ingredients table.`);
          } catch (error) {
            console.error(`Error inserting ingredient "${ingredient}":`, error);
          }
        }
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
