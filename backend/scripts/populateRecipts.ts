// backend\scripts\populateRecipts.ts
import mongoose from 'mongoose';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { MealType } from '../src/models/recipe';

// Load environment variables
dotenv.config();

// Define Recipe Schema directly in this file to avoid path issues
const recipeSchema = new mongoose.Schema(
  {
    recipeId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    image: { type: String },
    ingredients: [{ type: String }],
    instructions: [{ type: String }],
    mealType: {
      type: String,
      enum: Object.values(MealType),
      default: MealType.ANY,
    },
  },
  {
    collection: 'recipes',
  }
);

// Add an index to improve query performance
recipeSchema.index({ recipeId: 1 }, { unique: true });
recipeSchema.index({ mealType: 1 });

// Try to get or create the Recipe model
let Recipe: mongoose.Model<any>;
try {
  Recipe = mongoose.model('Recipe');
  console.log('Using existing Recipe model');
} catch (e) {
  Recipe = mongoose.model('Recipe', recipeSchema);
  console.log('Created new Recipe model');
}

// MongoDB connection
const connectDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Connection string:', process.env.MONGODB_CONNECTION_STRING);

    if (!process.env.MONGODB_CONNECTION_STRING) {
      throw new Error(
        'MONGODB_CONNECTION_STRING is not defined in environment variables'
      );
    }

    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Function to fetch recipes from TheMealDB API
const fetchMealsByCategory = async (category: string) => {
  try {
    console.log(`Fetching recipes for category: ${category}`);

    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/filter.php?c=${category}`
    );

    if (!response.data.meals) {
      console.log(`No meals found for category: ${category}`);
      return [];
    }

    return response.data.meals;
  } catch (error) {
    console.error(
      `Error fetching meals for category ${category}:`,
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
};

// Function to fetch detailed recipe information
const fetchMealDetails = async (mealId: string) => {
  try {
    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`
    );

    if (!response.data.meals || response.data.meals.length === 0) {
      console.log(`No details found for meal ID: ${mealId}`);
      return null;
    }

    return response.data.meals[0];
  } catch (error) {
    console.error(
      `Error fetching details for meal ID ${mealId}:`,
      error instanceof Error ? error.message : String(error)
    );
    return null;
  }
};

// Fetch recipes by first letter of name - to get more recipes
const fetchMealsByFirstLetter = async (letter: string) => {
  try {
    console.log(`Fetching recipes starting with letter: ${letter}`);

    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/search.php?f=${letter}`
    );

    if (!response.data.meals) {
      console.log(`No meals found starting with letter: ${letter}`);
      return [];
    }

    return response.data.meals;
  } catch (error) {
    console.error(`Error fetching meals for letter ${letter}:`, error instanceof Error ? error.message : String(error));
    return [];
  }
};

// Fetch recipes by search term
const fetchMealsBySearchTerm = async (term: string) => {
  try {
    console.log(`Fetching recipes with search term: ${term}`);

    const response = await axios.get(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${term}`
    );

    if (!response.data.meals) {
      console.log(`No meals found with search term: ${term}`);
      return [];
    }

    return response.data.meals;
  } catch (error) {
    console.error(
      `Error fetching meals for search term ${term}:`,
      error instanceof Error ? error.message : String(error)
    );
    return [];
  }
};

// Map TheMealDB categories to our schema's meal types
const categoryToMealType: { [key: string]: string } = {
  Breakfast: 'breakfast',
  Dessert: 'dessert',
  Starter: 'lunch',
  Side: 'lunch',
  Beef: 'dinner',
  Chicken: 'dinner',
  Lamb: 'dinner',
  Miscellaneous: 'any',
  Pasta: 'dinner',
  Pork: 'dinner',
  Seafood: 'dinner',
  Vegetarian: 'any',
  Vegan: 'any',
  Goat: 'dinner',
};

// Function to format recipe data according to our schema
const formatRecipe = (meal: any, idCounter: number) => {
  // Extract ingredients and measurements
  const ingredients: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim() !== '') {
      const fullIngredient =
        measure && measure.trim() !== ''
          ? `${measure.trim()} ${ingredient.trim()}`
          : ingredient.trim();

      ingredients.push(fullIngredient);
    }
  }

  // Skip if no ingredients
  if (ingredients.length === 0) {
    return null;
  }

  // Extract instructions
  let instructions: string[] = [];
  if (meal.strInstructions) {
    // Split by periods, new lines, or numbered steps
    instructions = meal.strInstructions
      .split(/\r\n|\n|\r|\.(?=\s[A-Z])/)
      .map((step: string) => step.trim())
      .filter((step: string) => step.length > 0 && !/^\d+$/.test(step));
  }

  // Skip if no instructions
  if (instructions.length === 0) {
    return null;
  }

  // Skip if no image
  if (!meal.strMealThumb) {
    return null;
  }

  // Determine meal type based on category
  const mealType = categoryToMealType[meal.strCategory] || 'any';

  return {
    recipeId: meal.idMeal ? parseInt(meal.idMeal) : idCounter,
    title: meal.strMeal,
    image: meal.strMealThumb,
    ingredients,
    instructions,
    mealType,
  };
};

// Main function to populate database
const populateRecipes = async () => {
  try {
    await connectDB();

    // Check if we already have recipes
    const existingCount = await Recipe.countDocuments();
    console.log(`Existing recipes in database: ${existingCount}`);

    if (existingCount > 1000) {
      console.log('Database already has sufficient recipes. Exiting...');
      process.exit(0);
    }

    // Set target to add at least 1000 recipes
    const targetCount = Math.max(1000, existingCount);
    console.log(
      `Target: Add recipes until we have at least ${targetCount} recipes`
    );
    let addedCount = 0;

    // Get available categories
    try {
      const categoriesResponse = await axios.get(
        'https://www.themealdb.com/api/json/v1/1/categories.php'
      );
      const categories = categoriesResponse.data.categories.map(
        (cat: any) => cat.strCategory
      );
      console.log('Available categories:', categories);

      // Set an ID counter for recipes that might be missing IDs
      let idCounter = 1000000;

      // Fetch recipes by category
      for (const category of categories) {
        const meals = await fetchMealsByCategory(category);
        console.log(`Found ${meals.length} meals in category ${category}`);

        for (const meal of meals) {
          try {
            // Check if recipe already exists
            const existingRecipe = await Recipe.findOne({
              recipeId: parseInt(meal.idMeal),
            });

            if (!existingRecipe) {
              // Fetch detailed recipe information
              const mealDetails = await fetchMealDetails(meal.idMeal);

              if (mealDetails) {
                // Format recipe according to our schema
                const recipe = formatRecipe(mealDetails, idCounter++);

                // Only add if recipe has all required data
                if (
                  recipe &&
                  recipe.title &&
                  recipe.image &&
                  recipe.ingredients.length > 0 &&
                  recipe.instructions.length > 0
                ) {
                  await Recipe.create(recipe);
                  console.log(`Added recipe: ${recipe.title}`);
                  addedCount++;
                }
              }
            } else {
              console.log(`Recipe already exists: ${meal.strMeal}`);
            }

            // Check if we've reached our target
            const currentCount = existingCount + addedCount;
            if (currentCount >= targetCount) {
              console.log(
                `Reached target of ${targetCount} recipes (current: ${currentCount})`
              );
              console.log(`Added ${addedCount} new recipes`);
              mongoose.disconnect();
              process.exit(0);
            }

            // Add a small delay to avoid overwhelming the API
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (error) {
            console.error(
              `Error processing meal ${meal.strMeal}:`,
              error instanceof Error ? error.message : String(error)
            );
          }
        }
      }

      // If we haven't reached our target yet, try fetching by letter
      if (existingCount + addedCount < targetCount) {
        console.log(`Still need more recipes. Fetching by letter...`);
        const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');

        for (const letter of letters) {
          const meals = await fetchMealsByFirstLetter(letter);
          console.log(
            `Found ${meals.length} meals starting with letter ${letter}`
          );

          for (const meal of meals) {
            try {
              // Check if recipe already exists
              const existingRecipe = await Recipe.findOne({
                recipeId: parseInt(meal.idMeal),
              });

              if (!existingRecipe) {
                // We already have detailed info from this API call
                const recipe = formatRecipe(meal, idCounter++);

                // Only add if recipe has all required data
                if (
                  recipe &&
                  recipe.title &&
                  recipe.image &&
                  recipe.ingredients.length > 0 &&
                  recipe.instructions.length > 0
                ) {
                  await Recipe.create(recipe);
                  console.log(`Added recipe: ${recipe.title}`);
                  addedCount++;
                }
              } else {
                console.log(`Recipe already exists: ${meal.strMeal}`);
              }

              // Check if we've reached our target
              const currentCount = existingCount + addedCount;
              if (currentCount >= targetCount) {
                console.log(
                  `Reached target of ${targetCount} recipes (current: ${currentCount})`
                );
                console.log(`Added ${addedCount} new recipes`);
                mongoose.disconnect();
                process.exit(0);
              }

              // Add a small delay to avoid overwhelming the API
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
              console.error(
                `Error processing meal ${meal.strMeal}:`,
                error instanceof Error ? error.message : String(error)
              );
            }
          }
        }
      }

      // If we still need more recipes, try common search terms
      if (existingCount + addedCount < targetCount) {
        console.log(`Still need more recipes. Trying search terms...`);
        const searchTerms = [
          'chicken',
          'beef',
          'pork',
          'fish',
          'pasta',
          'salad',
          'soup',
          'cake',
          'cookie',
          'pie',
          'bread',
          'rice',
          'potato',
          'vegetable',
          'breakfast',
          'dinner',
          'lunch',
          'dessert',
          'appetizer',
          'snack',
        ];

        for (const term of searchTerms) {
          const meals = await fetchMealsBySearchTerm(term);
          console.log(`Found ${meals.length} meals with search term ${term}`);

          for (const meal of meals) {
            try {
              // Check if recipe already exists
              const existingRecipe = await Recipe.findOne({
                recipeId: parseInt(meal.idMeal),
              });

              if (!existingRecipe) {
                // We already have detailed info from this API call
                const recipe = formatRecipe(meal, idCounter++);

                // Only add if recipe has all required data
                if (
                  recipe &&
                  recipe.title &&
                  recipe.image &&
                  recipe.ingredients.length > 0 &&
                  recipe.instructions.length > 0
                ) {
                  await Recipe.create(recipe);
                  console.log(`Added recipe: ${recipe.title}`);
                  addedCount++;
                }
              } else {
                console.log(`Recipe already exists: ${meal.strMeal}`);
              }

              // Check if we've reached our target
              const currentCount = existingCount + addedCount;
              if (currentCount >= targetCount) {
                console.log(
                  `Reached target of ${targetCount} recipes (current: ${currentCount})`
                );
                console.log(`Added ${addedCount} new recipes`);
                mongoose.disconnect();
                process.exit(0);
              }

              // Add a small delay to avoid overwhelming the API
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
              console.error(
                `Error processing meal ${meal.strMeal}:`,
                error.message
              );
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }

    console.log(
      `Recipe population completed! Added ${addedCount} new recipes.`
    );
    console.log(`Current recipe count: ${existingCount + addedCount}`);
    mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error in populateRecipes:', error);
    mongoose.disconnect();
    process.exit(1);
  }
};

// Run the population script
populateRecipes();
