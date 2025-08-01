// backend\src\controllers\RecipeController.ts - FIXED VERSION
import { Request, Response } from 'express';
import Recipe from '../models/recipe';
import Ingredient, { IngredientStatus } from '../models/ingredient';
import RecipeRecommendationService from '../services/RecipeRecommendationService';
import { RecipeUsage } from '../models/survey';

// Get all recipes (with pagination and filtering)
const getRecipes = async (req: Request, res: Response) => {
  try {
    const { mealType, page = 1, limit = 20, search } = req.query;

    // Build query
    let query: any = {};
    if (mealType && mealType !== 'any') {
      query.mealType = mealType;
    }
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Execute query
    const recipes = await Recipe.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort({ title: 1 });

    // Count total matching recipes
    const total = await Recipe.countDocuments(query);

    res.status(200).json({
      recipes,
      currentPage: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalRecipes: total,
    });
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ message: 'Error fetching recipes' });
  }
};

// Get a specific recipe by ID
const getRecipeById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const recipe = await Recipe.findById(id);

    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    res.status(200).json(recipe);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ message: 'Error fetching recipe' });
  }
};

// Get recommended recipes based on user's inventory with enhanced options
const getRecommendedRecipes = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // If userId is undefined, return an unauthorized error
    if (!userId) {
      return res.status(401).json({ message: 'User ID is required' });
    }

    // Get parameters from query
    const {
      mealType = 'any',
      count = 5,
      prioritizeExpiring = 'true',
      includeIngredients = '',
    } = req.query;

    // Parse parameters
    const prioritizeExpiringBool = prioritizeExpiring === 'true';
    const selectedIngredients = includeIngredients
      ? (includeIngredients as string).split(',').filter(Boolean)
      : [];

    // Create options object
    const options = {
      mealType: mealType as string,
      prioritizeExpiring: prioritizeExpiringBool,
      selectedIngredients:
        selectedIngredients.length > 0 ? selectedIngredients : undefined,
    };

    console.log('FIXED: Getting recommendations with options:', options);

    // Get recommendations with enhanced options
    const recommendedRecipes =
      await RecipeRecommendationService.getRecommendedRecipes(
        userId,
        options,
        Number(count)
      );

    console.log('FIXED: Returning', recommendedRecipes.length, 'recommendations');

    res.status(200).json(recommendedRecipes);
  } catch (error) {
    console.error('Error getting recommended recipes:', error);
    res.status(500).json({ message: 'Error getting recommended recipes' });
  }
};

const acceptRecipe = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id: recipeId } = req.params;
    const { usedIngredients, wasRecommended = false } = req.body;

    console.log('FIXED: Accept recipe request:', {
      userId,
      recipeId,
      usedIngredients,
      wasRecommended,
    });

    if (!userId) {
      return res.status(401).json({ message: 'User ID is required' });
    }

    if (!usedIngredients || !Array.isArray(usedIngredients)) {
      return res
        .status(400)
        .json({ message: 'Used ingredients array is required' });
    }

    // Get the recipe
    const recipe = await Recipe.findById(recipeId);
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // FIXED: Get ONLY available ingredients (not consumed/expired/wasted)
    const inventory = await Ingredient.find({
      userId,
      status: IngredientStatus.AVAILABLE,
    });

    console.log('FIXED: Found', inventory.length, 'AVAILABLE ingredients in inventory');

    if (inventory.length === 0) {
      return res.status(400).json({
        message: 'No available ingredients found in your inventory',
      });
    }

    // Helper function to normalize ingredient names for EXACT matching
    const normalizeIngredient = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.,;:!?'"()]/g, '')
        .trim();
    };

    // Process each ingredient
    const consumedIngredients = [];
    const notFoundIngredients = [];

    for (const ingredientName of usedIngredients) {
      const normalizedUsedName = normalizeIngredient(ingredientName);

      // Find EXACT matching ingredient in inventory
      const matchingIngredient = inventory.find((inv) => {
        if (inv.status !== IngredientStatus.AVAILABLE) return false;
        const normalizedInvName = normalizeIngredient(inv.name);
        // EXACT match only
        return normalizedInvName === normalizedUsedName;
      });

      if (matchingIngredient) {
        // FIXED: Update ingredient status - consume the ENTIRE quantity
        matchingIngredient.status = IngredientStatus.CONSUMED;
        matchingIngredient.consumedDate = new Date();
        matchingIngredient.consumedInRecipe = recipe._id;
        
        // Note: We're consuming the entire ingredient regardless of quantity needed
        await matchingIngredient.save();
        consumedIngredients.push(matchingIngredient);

        console.log(`FIXED: Consumed entire ingredient: ${matchingIngredient.name} (${matchingIngredient.quantity} ${matchingIngredient.unit})`);
      } else {
        notFoundIngredients.push(ingredientName);
        console.log(`FIXED: Ingredient not found for exact match: "${ingredientName}"`);
      }
    }

    if (notFoundIngredients.length > 0 && consumedIngredients.length === 0) {
      console.log('FIXED: No ingredients matched. Sent ingredients:', usedIngredients);
      console.log(
        'FIXED: Available inventory names:',
        inventory.map((i) => i.name)
      );
      return res.status(400).json({
        message: 'No matching ingredients found in your available inventory',
        notFound: notFoundIngredients,
        hint: 'Make sure the ingredient names match EXACTLY with your available inventory',
      });
    }

    // Update recipe usage statistics
    recipe.usageCount += 1;
    recipe.lastUsedDate = new Date();
    recipe.usedByUsers.push({
      userId,
      usedAt: new Date(),
    });
    await recipe.save();

    // Track recipe usage for metrics
    try {
      const recipeUsage = new RecipeUsage({
        userId,
        recipeId: recipe._id,
        wasRecommended,
        ingredientsUsed: usedIngredients,
        usedDate: new Date(),
      });
      await recipeUsage.save();
      
      console.log('FIXED: Recipe usage tracked successfully');
    } catch (usageError) {
      console.warn('FIXED: Failed to track recipe usage:', usageError);
      // Don't fail the main operation if usage tracking fails
    }

    res.status(200).json({
      message: `Recipe accepted! ${consumedIngredients.length} ingredients fully consumed and marked as 'consumed' status.`,
      consumedIngredients: consumedIngredients.map((ing) => ({
        name: ing.name,
        category: ing.category,
        quantity: ing.quantity,
        unit: ing.unit,
        fullyConsumed: true,
        newStatus: 'consumed',
      })),
      recipe: {
        title: recipe.title,
        usageCount: recipe.usageCount,
      },
    });
  } catch (error) {
    console.error('Error accepting recipe:', error);
    res.status(500).json({ message: 'Error accepting recipe' });
  }
};

export default {
  getRecipes,
  getRecipeById,
  getRecommendedRecipes,
  acceptRecipe,
};