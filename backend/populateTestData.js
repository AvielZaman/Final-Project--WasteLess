// backend\populateTestData.js

// Recipe-based ingredient seeder - Plain JavaScript
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { faker } = require('@faker-js/faker');

// Load environment variables
dotenv.config();

// Define schemas
const ingredientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'dry',
        'vegetable',
        'fruit',
        'dairy',
        'meat',
        'frozen',
        'bakery',
        'other',
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 1,
    },
    unit: {
      type: String,
      default: 'unit',
    },
    expiryDate: {
      type: Date,
    },
    aboutToExpire: {
      type: Boolean,
      default: false,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['available', 'consumed', 'expired', 'wasted'],
      default: 'available',
    },
    additionalInfo: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const userSchema = new mongoose.Schema({
  auth0Id: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
});

const recipeSchema = new mongoose.Schema(
  {
    recipeId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    image: { type: String },
    ingredients: [{ type: String }],
    instructions: [{ type: String }],
    mealType: {
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'dessert', 'any'],
      default: 'any',
    },
  },
  {
    collection: 'recipes',
    timestamps: true,
  }
);

// Add indices
ingredientSchema.index({ userId: 1, category: 1 });
ingredientSchema.index({ userId: 1, status: 1 });

// Create or get models
let Ingredient, User, Recipe;
try {
  Ingredient = mongoose.model('Ingredient');
} catch (e) {
  Ingredient = mongoose.model('Ingredient', ingredientSchema);
}

try {
  User = mongoose.model('User');
} catch (e) {
  User = mongoose.model('User', userSchema);
}

try {
  Recipe = mongoose.model('Recipe');
} catch (e) {
  Recipe = mongoose.model('Recipe', recipeSchema);
}

// Ingredient category enum
const IngredientCategory = {
  DRY: 'dry',
  VEGETABLE: 'vegetable',
  FRUIT: 'fruit',
  DAIRY: 'dairy',
  MEAT: 'meat',
  FROZEN: 'frozen',
  BAKERY: 'bakery',
  OTHER: 'other',
};

// Keywords to help categorize ingredients
const categoryKeywords = {
  [IngredientCategory.DRY]: [
    'rice',
    'pasta',
    'flour',
    'sugar',
    'salt',
    'pepper',
    'spice',
    'oil',
    'vinegar',
    'sauce',
    'powder',
    'dried',
    'bean',
    'lentil',
    'oats',
    'cereal',
    'noodle',
    'seasoning',
    'herbs',
    'cumin',
    'paprika',
    'oregano',
    'basil',
    'thyme',
  ],
  [IngredientCategory.VEGETABLE]: [
    'onion',
    'garlic',
    'carrot',
    'celery',
    'pepper',
    'tomato',
    'potato',
    'broccoli',
    'spinach',
    'lettuce',
    'cabbage',
    'zucchini',
    'eggplant',
    'mushroom',
    'corn',
    'cucumber',
    'vegetable',
    'veggie',
    'salad',
    'greens',
  ],
  [IngredientCategory.FRUIT]: [
    'apple',
    'banana',
    'orange',
    'lemon',
    'lime',
    'berry',
    'strawberry',
    'grape',
    'melon',
    'pineapple',
    'mango',
    'fruit',
    'peach',
    'pear',
  ],
  [IngredientCategory.DAIRY]: [
    'milk',
    'cheese',
    'butter',
    'cream',
    'yogurt',
    'dairy',
    'cheddar',
    'mozzarella',
    'parmesan',
    'feta',
    'cottage',
    'sour cream',
  ],
  [IngredientCategory.MEAT]: [
    'chicken',
    'beef',
    'pork',
    'turkey',
    'lamb',
    'meat',
    'bacon',
    'sausage',
    'ham',
    'steak',
    'ground',
    'fish',
    'salmon',
    'tuna',
    'shrimp',
    'seafood',
  ],
  [IngredientCategory.FROZEN]: ['frozen', 'ice cream', 'ice'],
  [IngredientCategory.BAKERY]: [
    'bread',
    'bun',
    'roll',
    'bagel',
    'muffin',
    'croissant',
    'cake',
    'cookie',
    'pastry',
    'donut',
    'bakery',
    'baked',
  ],
};

// Function to categorize an ingredient based on its name
function categorizeIngredient(ingredientName) {
  const lowerName = ingredientName.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => lowerName.includes(keyword))) {
      return category;
    }
  }

  // Default to 'other' if no category matches
  return IngredientCategory.OTHER;
}

// Generate appropriate unit based on ingredient name and category
function getUnitForIngredient(ingredientName, category) {
  const lowerName = ingredientName.toLowerCase();

  // Check for specific patterns in the name
  if (lowerName.includes('chopped') || lowerName.includes('diced')) {
    return 'cup';
  }
  if (lowerName.includes('slice')) {
    return 'slice';
  }
  if (lowerName.includes('can') || lowerName.includes('canned')) {
    return 'can';
  }
  if (lowerName.includes('package') || lowerName.includes('packet')) {
    return 'package';
  }

  // Default units by category
  switch (category) {
    case IngredientCategory.DRY:
      return faker.helpers.arrayElement(['cup', 'g', 'tbsp', 'tsp', 'package']);
    case IngredientCategory.VEGETABLE:
    case IngredientCategory.FRUIT:
      return faker.helpers.arrayElement(['piece', 'cup', 'g', 'bunch']);
    case IngredientCategory.DAIRY:
      return faker.helpers.arrayElement(['cup', 'ml', 'tbsp', 'package']);
    case IngredientCategory.MEAT:
      return faker.helpers.arrayElement(['g', 'piece', 'lb']);
    case IngredientCategory.BAKERY:
      return faker.helpers.arrayElement(['slice', 'piece', 'loaf']);
    default:
      return 'unit';
  }
}

// MongoDB connection
async function connectToDatabase() {
  try {
    console.log('Connecting to MongoDB...');

    if (!process.env.MONGODB_CONNECTION_STRING) {
      throw new Error(
        'MONGODB_CONNECTION_STRING is not defined in environment variables'
      );
    }

    await mongoose.connect(process.env.MONGODB_CONNECTION_STRING);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Main function to populate ingredients from recipes
async function populateFromRecipes() {
  try {
    await connectToDatabase();

    // Get a user to associate with the test data
    const user = await User.findOne();
    if (!user) {
      console.error(
        'No user found in the database. Please create a user first.'
      );
      process.exit(1);
    }

    console.log(`Using user ID: ${user._id} for test data`);
    const userId = user._id;

    // Clear existing ingredients for this user (optional)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      console.log('Clearing existing ingredients...');
      await Ingredient.deleteMany({ userId });
    }

    // Fetch all recipes
    console.log('Fetching recipes from database...');
    const recipes = await Recipe.find({});
    console.log(`Found ${recipes.length} recipes`);

    if (recipes.length === 0) {
      console.error('No recipes found in the database');
      process.exit(1);
    }

    // Extract all unique ingredients from recipes
    const allIngredients = new Set();
    recipes.forEach((recipe) => {
      if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach((ing) => {
          // Clean the ingredient name (remove leading/trailing spaces)
          const cleanedIng = ing.trim();
          if (cleanedIng) {
            allIngredients.add(cleanedIng);
          }
        });
      }
    });

    console.log(
      `Found ${allIngredients.size} unique ingredients across all recipes`
    );

    // Convert to array and shuffle
    const ingredientArray = Array.from(allIngredients);
    const shuffled = ingredientArray.sort(() => 0.5 - Math.random());

    // Take 250 random ingredients (or all if less than 250)
    const selectedIngredients = shuffled.slice(
      0,
      Math.min(400, shuffled.length)
    );
    console.log(`Selected ${selectedIngredients.length} ingredients to add`);

    // Create ingredient documents
    const ingredientDocs = [];
    const today = new Date();

    selectedIngredients.forEach((ingredientName, index) => {
      const category = categorizeIngredient(ingredientName);

      // Determine if this should be about to expire (20% chance)
      const isAboutToExpire =
        index < Math.floor(selectedIngredients.length * 0.2);

      // Generate expiry date
      let expiryDate = null;
      let aboutToExpire = false;

      if (category !== IngredientCategory.DRY) {
        if (isAboutToExpire) {
          // Expiring in 1-3 days
          expiryDate = new Date(today);
          expiryDate.setDate(
            today.getDate() + faker.number.int({ min: 1, max: 3 })
          );
          aboutToExpire = true;
        } else {
          // Random expiry between 4-30 days
          expiryDate = new Date(today);
          expiryDate.setDate(
            today.getDate() + faker.number.int({ min: 4, max: 30 })
          );
        }
      }

      // Generate quantity
      const quantity = faker.number.float({
        min: 0.5,
        max: 5,
        multipleOf: 0.5,
      });

      // Get appropriate unit
      const unit = getUnitForIngredient(ingredientName, category);

      // Create ingredient document
      const ingredient = {
        userId,
        name: ingredientName,
        category,
        quantity,
        unit,
        expiryDate,
        aboutToExpire,
        purchaseDate: faker.date.recent({ days: 7 }),
        status: 'available',
        additionalInfo: faker.helpers.maybe(
          () => `From recipe collection - ${faker.company.name()} brand`,
          { probability: 0.3 }
        ),
      };

      ingredientDocs.push(ingredient);
    });

    // Insert all ingredients
    console.log('Inserting ingredients into database...');
    const result = await Ingredient.insertMany(ingredientDocs);
    console.log(`Successfully added ${result.length} ingredients!`);

    // Show summary
    const categoryCounts = {};
    ingredientDocs.forEach((doc) => {
      categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
    });

    console.log('\nIngredient Summary:');
    console.log('==================');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`${category}: ${count} items`);
    });

    const expiringCount = ingredientDocs.filter(
      (doc) => doc.aboutToExpire
    ).length;
    console.log(`\nExpiring soon: ${expiringCount} items`);

    // Show some example ingredients
    console.log('\nSample ingredients added:');
    ingredientDocs.slice(0, 5).forEach((doc) => {
      console.log(
        `- ${doc.name} (${doc.category}) - ${doc.quantity} ${doc.unit}`
      );
    });
  } catch (error) {
    console.error('Error populating database:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
populateFromRecipes();
