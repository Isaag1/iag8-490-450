const fs = require('fs');
const axios = require('axios');

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

async function fetchData() {
  try {
    const response = await axios.request(options);
    const recipes = response.data.results; // Extract the "results" array from the response

    // Choose specific data from each recipe in the "results" array
    const selectedRecipes = recipes.map((recipe) => ({
      name: recipe.name,
      photo: recipe.thumbnail_url,
      ingredientList: recipe.sections
        .filter((section) => section.section_type === 'ingredients')
        .flatMap((section) => section.components.map((component) => component.raw_text)),
      steps: recipe.instructions
        .filter((instruction) => instruction.language === 'eng')
        .map((instruction) => instruction.display_text),
      nutrition: recipe.nutrition,
      tags: recipe.tags,
    }));

    // Convert the selected data to JSON
    const jsonData = JSON.stringify(selectedRecipes, null, 2);

    // Save the JSON data to a file
    fs.writeFileSync('selected_recipes.json', jsonData, 'utf8');
    console.log('Selected data has been saved to selected_recipes.json file.');
  } catch (error) {
    console.error(error);
  }
}

// Call the async function to fetch data and save it to a file
fetchData();
