// backend\src\services\RecipeRecommendationService.ts
import Ingredient from '../models/ingredient';
import Recipe from '../models/recipe';
import { differenceInDays } from 'date-fns';
import {
  buildFlowNetwork,
  findOptimalRecipeWithAlternatives,
  type WeightedIngredient,
  type RecipeScoreResult,
} from '../utils/maxFlow';

// Enable debug mode to get more detailed logs
const DEBUG_MODE = true;

interface RecommendationOptions {
  mealType: string;
  prioritizeExpiring: boolean;
  selectedIngredients?: string[];
}

class RecipeRecommendationService {
  // Convert inventory ingredients to weighted ingredients for the algorithm
  private static convertToWeightedIngredients(
    ingredients: any[],
    options: RecommendationOptions
  ): WeightedIngredient[] {
    if (DEBUG_MODE)
      console.log('Converting ingredients with options:', options);

    const today = new Date();
    const { prioritizeExpiring, selectedIngredients } = options;

    // Filter ingredients if specific ones are selected
    const filteredIngredients =
      selectedIngredients && selectedIngredients.length > 0
        ? ingredients.filter((ing) => {
            const nameMatch = selectedIngredients.some(
              (selectedName) =>
                ing.name.toLowerCase().includes(selectedName.toLowerCase()) ||
                selectedName.toLowerCase().includes(ing.name.toLowerCase())
            );
            if (DEBUG_MODE && nameMatch) {
              console.log(`Selected ingredient match: ${ing.name}`);
            }
            return nameMatch;
          })
        : ingredients;

    if (DEBUG_MODE) {
      console.log(`Filtered ingredients count: ${filteredIngredients.length}`);
      if (selectedIngredients && selectedIngredients.length > 0) {
        console.log('Selected ingredients for filtering:', selectedIngredients);
      }
    }

    return filteredIngredients.map((ingredient) => {
      // Calculate days until expiry
      let daysUntilExpiry = 999; // Default for items without expiry
      if (ingredient.expiryDate) {
        const expiryDate = new Date(ingredient.expiryDate);
        daysUntilExpiry = differenceInDays(expiryDate, today);
        // Cap negative values at -1 (expired)
        daysUntilExpiry = Math.max(-1, daysUntilExpiry);
      }

      // Calculate weight based on expiry urgency
      // If prioritizeExpiring is true, give significantly higher weight to expiring items
      let weight = 1.0;
      const expiryMultiplier = prioritizeExpiring ? 3.0 : 1.5;

      if (ingredient.aboutToExpire) {
        weight = 3.0 * expiryMultiplier;
      } else if (daysUntilExpiry <= 0) {
        weight = 5.0 * expiryMultiplier; // Expired
      } else if (daysUntilExpiry <= 3) {
        weight = 4.0 * expiryMultiplier; // Urgent
      } else if (daysUntilExpiry <= 7) {
        weight = 2.0 * expiryMultiplier; // Soon
      }

      // If this is a specifically selected ingredient, increase its weight even more
      if (
        selectedIngredients &&
        selectedIngredients.some(
          (name) =>
            name.toLowerCase() === ingredient.name.toLowerCase() ||
            name.toLowerCase().includes(ingredient.name.toLowerCase()) ||
            ingredient.name.toLowerCase().includes(name.toLowerCase())
        )
      ) {
        weight *= 2.0;
        if (DEBUG_MODE) {
          console.log(
            `Boosted weight for selected ingredient ${ingredient.name} to ${weight}`
          );
        }
      }

      const result = {
        id: ingredient._id.toString(),
        name: ingredient.name,
        weight,
        daysUntilExpiry,
        originalIngredient: {
          quantity: ingredient.quantity,
          unit: ingredient.unit,
        },
      };

      if (DEBUG_MODE && weight > 1.0) {
        console.log(
          `Weighted ingredient: ${ingredient.name}, weight: ${weight}, days: ${daysUntilExpiry}`
        );
      }

      return result;
    });
  }

  // Convert database recipes to the format expected by the algorithm - REALISTIC SCORING
  private static convertDbRecipesToAlgoFormat(
    recipes: any[],
    mealType: string
  ): any[] {
    if (DEBUG_MODE) {
      console.log(
        `Converting ${recipes.length} recipes for meal type: ${mealType}`
      );
    }

    return recipes.map((recipe) => {
      // REALISTIC: Much lower base score range (20-60 instead of 40-90)
      const baseScore = Math.floor(Math.random() * 40) + 20;

      // REALISTIC: Smaller meal type boost (1.2x instead of 1.5x)
      const mealTypeBoost =
        recipe.mealType === mealType
          ? 1.2
          : recipe.mealType === 'any'
          ? 1.1
          : 1.0;

      // REALISTIC: Smaller complexity factor
      const complexityFactor = 1 + (recipe.ingredients.length % 5) * 0.05; // 1.0-1.2 instead of 1.0-1.4

      const initialScore = baseScore * mealTypeBoost * complexityFactor;

      if (DEBUG_MODE && recipe.mealType === mealType) {
        console.log(
          `REALISTIC base score for ${recipe.title}: ${initialScore.toFixed(1)}`
        );
      }

      return {
        id: recipe._id.toString(),
        title: recipe.title,
        image: recipe.image,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        mealType: recipe.mealType,
        score: initialScore,
      };
    });
  }

  // Get recommended recipes based on user's inventory with enhanced options
  public static async getRecommendedRecipes(
    userId: string,
    options: RecommendationOptions = {
      mealType: 'any',
      prioritizeExpiring: true,
    },
    count: number = 5
  ): Promise<RecipeScoreResult[]> {
    try {
      // Extract options
      const { mealType = 'any' } = options;

      if (DEBUG_MODE) {
        console.log(`Getting recipe recommendations for user ${userId}`);
        console.log('Options:', options);
        console.log('Requested count:', count);
      }

      // Get user's inventory
      const ingredients = await Ingredient.find({ userId });

      if (DEBUG_MODE) {
        console.log(
          `Found ${ingredients.length} ingredients in user's inventory`
        );
      }

      // If no ingredients, return empty array
      if (ingredients.length === 0) {
        if (DEBUG_MODE)
          console.log('No ingredients found, returning empty array');
        return [];
      }

      // Get recipes from database with filtering
      let recipesQuery = Recipe.find();
      if (mealType !== 'any') {
        recipesQuery = recipesQuery.or([{ mealType }, { mealType: 'any' }]);
      }
      const recipes = await recipesQuery.limit(1000);

      if (DEBUG_MODE) {
        console.log(
          `Found ${recipes.length} recipes matching meal type criteria`
        );
      }

      if (recipes.length === 0) {
        if (DEBUG_MODE) console.log('No recipes found, returning empty array');
        return [];
      }

      // Convert to algorithm formats with REALISTIC weighting
      const weightedIngredients = this.convertToWeightedIngredients(
        ingredients,
        options
      );
      const algoRecipes = this.convertDbRecipesToAlgoFormat(recipes, mealType);

      // Build network and find optimal recipes with meal type preference
      const flowNetwork = buildFlowNetwork(
        weightedIngredients,
        algoRecipes,
        mealType
      );

      // Enhanced algorithm call - uses the maxFlow algorithm but with our modified options
      const recommendedRecipes = findOptimalRecipeWithAlternatives(
        flowNetwork,
        weightedIngredients,
        algoRecipes,
        count
      );

      if (DEBUG_MODE) {
        console.log(
          `Raw recommendations from algorithm: ${recommendedRecipes.length}`
        );
        console.log(
          'REALISTIC scores:',
          recommendedRecipes.map((r) => `${r.title}: ${r.score}`)
        );
      }

      // Add additional metadata for frontend display - scores are already realistic from maxFlow
      const recipesWithMetadata = recommendedRecipes.map((recipe) => {
        // Count how many ingredients are expiring
        const expiringIngredients = recipe.usedIngredients.filter((ingName) => {
          const matchingIngredient = ingredients.find(
            (ing) => ing.name === ingName
          );
          return matchingIngredient && matchingIngredient.aboutToExpire;
        }).length;

        // Calculate match count and total
        const totalIngredients =
          recipe.usedIngredients.length + recipe.missedIngredients.length;
        const matchCount = recipe.usedIngredients.length;

        return {
          ...recipe,
          matchCount,
          totalIngredients,
          expiringIngredients,
          // REALISTIC: Score is already calculated realistically in maxFlow, no additional processing needed
        };
      });

      // REMOVED: Score normalization that was inflating scores
      // The realistic scores from maxFlow are already properly scaled

      // Sort recipes by score in descending order (already realistic)
      const sortedRecipes = recipesWithMetadata.sort((a, b) => b.score - a.score);

      if (DEBUG_MODE) {
        console.log(
          'Final REALISTIC scores:',
          sortedRecipes.map((r) => `${r.title}: ${r.score}`)
        );
      }

      return sortedRecipes;
    } catch (error) {
      console.error('Error getting recommended recipes:', error);
      throw error;
    }
  }
}

export default RecipeRecommendationService;