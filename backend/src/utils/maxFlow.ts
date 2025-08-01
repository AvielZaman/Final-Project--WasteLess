// backend/src/utils/maxFlow.ts - FIXED VERSION

import IngredientMatcher from './ingredientMatcher';

// Enable debugging for easier troubleshooting
const DEBUG_MODE = true;

// Weighted ingredient from the inventory
interface WeightedIngredient {
  id: string;
  name: string;
  weight: number;
  daysUntilExpiry: number;
  originalIngredient?:
    | {
        quantity?: number | string;
        unit?: string;
      }
    | Record<string, never>;
}

// Recipe data structure
interface Recipe {
  id: string;
  title: string;
  image?: string;
  ingredients: string[];
  instructions: string[];
  mealType: string;
  score?: number;
}

// Edge in the flow network
interface Edge {
  capacity: number;
  flow: number;
  expiryWeight?: number;
  matchQuality?: number;
  matchedWith?: string | null;
  quantity?: number;
  unit?: string;
  quantityFactor?: number;
  recipeScore?: number;
  matchedIngredientsCount?: number;
  totalRecipeIngredients?: number;
  coverageRatio?: number;
  mealTypeBoost?: number;
  totalImportance?: number;
  matchedIngredients?: string[];
  normalizedQuantity?: number;
  daysUntilExpiry?: number;
  nutritionBoost?: number;
  nutritionCategory?: string;
  balancedMealBoost?: number;
}

// Graph structure for flow network
interface FlowNetwork {
  vertices: string[];
  edges: Record<string, Edge>;
  filteredRecipes?: Recipe[];
  preferredMealType?: string;
}

// Match result for ingredient matching
interface IngredientMatch {
  ingredient: string | null;
  quality: number;
}

// Recipe score result
interface RecipeScoreResult {
  id: string;
  title: string;
  image?: string;
  score: number;
  mealType: string;
  usedIngredients: string[];
  missedIngredients: string[];
  instructions: string[];
  matchCount?: number;
  totalIngredients?: number;
  expiringIngredients?: number;
}

// Used ingredient with expiry
interface UsedIngredientWithExpiry {
  id: string;
  name: string;
  daysUntilExpiry: number;
  matchQuality: number;
  matchedWith: string | null;
  quantity: number;
  unit: string;
  quantityFactor: number;
}

// Edmonds-Karp algorithm result
interface EdmondsKarpResult {
  flow: number;
  flowPaths: Array<string[]>;
}

// Define nutrition category type
type NutritionCategory = 'protein' | 'vegetables' | 'grains' | 'dairy';

// Enhanced ingredient matching function using IngredientMatcher
function findBestIngredientMatch(
  ingredientName: string,
  recipeIngredients: string[]
): IngredientMatch {
  // Use the enhanced matcher with debug mode
  const match = IngredientMatcher.findBestMatch(
    ingredientName,
    recipeIngredients,
    DEBUG_MODE
  );
  
  return {
    ingredient: match.ingredient,
    quality: match.quality
  };
}

// Build a flow network from weighted ingredients and recipes
function buildFlowNetwork(
  weightedIngredients: WeightedIngredient[],
  recipes: Recipe[],
  preferredMealType: string = 'any'
): FlowNetwork {
  const vertices: string[] = ['s', 't'];

  if (DEBUG_MODE) {
    console.log(`\n=== BUILDING FLOW NETWORK ===`);
    console.log(`Total ingredients: ${weightedIngredients.length}`);
    console.log(`Total recipes: ${recipes.length}`);
    console.log(`Preferred meal type: ${preferredMealType}`);
  }

  // Add ingredient vertices
  weightedIngredients.forEach((ing) => vertices.push(`i_${ing.id}`));

  // Filter recipes by meal type if needed
  let filteredRecipes =
    preferredMealType !== 'any'
      ? recipes.filter(
          (recipe) =>
            recipe.mealType === preferredMealType || recipe.mealType === 'any'
        )
      : recipes;

  if (DEBUG_MODE) {
    console.log(`Filtered recipes: ${filteredRecipes.length}`);
  }

  // Add recipe vertices
  filteredRecipes.forEach((recipe) => vertices.push(`r_${recipe.id}`));

  // Create edges
  const edges: Record<string, Edge> = {};

  // Connect source to ingredients with capacity based on quantity and urgency
  weightedIngredients.forEach((ing) => {
    const edgeId = `s-i_${ing.id}`;
    const originalIngredient = ing.originalIngredient || {};
    const quantity = parseFloat(originalIngredient.quantity?.toString() || '1');
    const unit = originalIngredient.unit || 'unit';

    const normalizedQuantity = normalizeQuantity(quantity, unit);
    const expiryFactor = calculateExpiryFactor(ing.daysUntilExpiry);

    edges[edgeId] = {
      capacity: normalizedQuantity,
      flow: 0,
      expiryWeight: ing.weight * expiryFactor,
      normalizedQuantity,
      daysUntilExpiry: ing.daysUntilExpiry,
    };
  });

  // Connect ingredients to recipes with enhanced matching and REASONABLE threshold
  filteredRecipes.forEach((recipe) => {
    const recipeId = `r_${recipe.id}`;
    const mealTypeBoost =
      recipe.mealType === preferredMealType
        ? 2.5 // Strong meal type preference
        : recipe.mealType === 'any'
        ? 1.2
        : 0.8; // Penalty for non-matching meal types
    
    const matchedIngredients: Array<
      WeightedIngredient & {
        adjustedWeight: number;
        matchQuality: number;
        matchedWith: string;
        quantityFactor: number;
      }
    > = [];

    weightedIngredients.forEach((ingredient) => {
      const ingredientName = ingredient.name;
      const bestMatch = findBestIngredientMatch(
        ingredientName,
        recipe.ingredients
      );

      // FIXED: More reasonable threshold for ingredient matching
      if (bestMatch.quality >= 0.7) {
        const edgeId = `i_${ingredient.id}-${recipeId}`;

        const originalIngredient = ingredient.originalIngredient || {};
        const quantity = parseFloat(
          originalIngredient.quantity?.toString() || '1'
        );
        const unit = originalIngredient.unit || 'unit';

        const normalizedQuantity = normalizeQuantity(quantity, unit);
        const expiryFactor = calculateExpiryFactor(ingredient.daysUntilExpiry);
        const quantityFactor = Math.min(
          3,
          Math.log10(normalizedQuantity + 1) + 1
        );

        // Scale weight by match quality and add quality bonus
        const qualityBonus = bestMatch.quality >= 0.9 ? 1.2 : 1.0;
        const adjustedWeight = calculateIngredientWeight(
          ingredient.weight,
          expiryFactor,
          bestMatch.quality,
          mealTypeBoost,
          quantityFactor
        ) * qualityBonus;

        edges[edgeId] = {
          capacity: normalizedQuantity,
          flow: 0,
          expiryWeight: adjustedWeight,
          matchQuality: bestMatch.quality,
          matchedWith: bestMatch.ingredient,
          quantity,
          unit,
          quantityFactor,
        };

        matchedIngredients.push({
          ...ingredient,
          adjustedWeight,
          matchQuality: bestMatch.quality,
          matchedWith: bestMatch.ingredient || '',
          quantityFactor,
        });

        if (DEBUG_MODE) {
          console.log(`✅ ACCEPTED MATCH: "${ingredient.name}" -> "${bestMatch.ingredient}" (quality: ${bestMatch.quality.toFixed(2)})`);
        }
      } else if (DEBUG_MODE && bestMatch.quality > 0) {
        console.log(`❌ REJECTED LOW QUALITY: "${ingredient.name}" -> "${bestMatch.ingredient}" (quality: ${bestMatch.quality.toFixed(2)}, need 0.70+)`);
      } else if (DEBUG_MODE) {
        console.log(`❌ NO MATCH: "${ingredient.name}" -> no suitable matches found`);
      }
    });

    // Connect recipe to sink with improved recipe evaluation
    const edgeId = `${recipeId}-t`;
    const totalRecipeIngredients = recipe.ingredients.length || 1;
    const coverageRatio = Math.min(
      1.0,
      matchedIngredients.length / totalRecipeIngredients
    );

    // Calculate recipe importance with match quality consideration
    const avgMatchQuality = matchedIngredients.length > 0
      ? matchedIngredients.reduce((sum, ing) => sum + ing.matchQuality, 0) / matchedIngredients.length
      : 0;
    
    const recipeImportance = calculateRecipeImportance(
      matchedIngredients,
      mealTypeBoost,
      totalRecipeIngredients
    ) * (0.8 + avgMatchQuality * 0.2);

    edges[edgeId] = {
      capacity: coverageRatio * 100,
      flow: 0,
      recipeScore: recipe.score || 0,
      matchedIngredientsCount: matchedIngredients.length,
      totalRecipeIngredients,
      coverageRatio,
      mealTypeBoost,
      totalImportance: recipeImportance,
      matchedIngredients: matchedIngredients.map((ing: { name: any; }) => ing.name),
    };

    if (DEBUG_MODE) {
      console.log(`📝 Recipe "${recipe.title}": ${matchedIngredients.length}/${totalRecipeIngredients} ingredients matched (${(coverageRatio * 100).toFixed(1)}% coverage)`);
    }
  });

  // Create the network
  const network = {
    vertices,
    edges,
    filteredRecipes,
    preferredMealType,
  };

  return network;
}

// Normalize ingredient quantity based on unit
function normalizeQuantity(quantity: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'kilo':
    case 'kg':
      return quantity * 1000; // convert to grams
    case 'liter':
    case 'l':
      return quantity * 1000; // convert to ml
    case 'tbsp':
      return quantity * 15; // approx ml in tablespoon
    case 'tsp':
      return quantity * 5; // approx ml in teaspoon
    case 'cup':
      return quantity * 240; // approx ml in a cup
    default:
      return quantity; // keep as is for 'unit', 'piece', etc.
  }
}

// Calculate expiry factor based on days until expiry
function calculateExpiryFactor(daysUntilExpiry: number): number {
  return daysUntilExpiry <= 7 ? 5.0 : 1.0;
}

// Calculate ingredient weight
function calculateIngredientWeight(
  baseWeight: number,
  expiryFactor: number,
  matchQuality: number,
  mealTypeBoost: number,
  quantityFactor: number
): number {
  const expiryWeight = expiryFactor * 0.45;
  const matchWeight = matchQuality * 0.15;
  const mealTypeWeight = mealTypeBoost * 0.2 * quantityFactor;
  const baseFactorWeight = baseWeight * 0.2;

  return baseFactorWeight + expiryWeight + matchWeight + mealTypeWeight;
}

// Calculate recipe importance
function calculateRecipeImportance(
  matchedIngredients: Array<
    WeightedIngredient & {
      adjustedWeight: number;
      matchQuality: number;
      matchedWith: string;
      quantityFactor: number;
    }
  >,
  mealTypeBoost: number,
  totalIngredients: number
): number {
  if (matchedIngredients.length === 0) return 0.1 * mealTypeBoost;

  let totalUrgency = 0;
  matchedIngredients.forEach((ingredient) => {
    const expiryUrgency = Math.max(1, 10 - (ingredient.daysUntilExpiry || 0));
    totalUrgency += (ingredient.adjustedWeight || 1) * (expiryUrgency / 10);
  });

  const matchPercentage = matchedIngredients.length / totalIngredients;
  return (totalUrgency * 0.6 + matchPercentage * 0.4) * mealTypeBoost;
}

// FIXED: Find optimal recipe and alternatives with CORRECTED scoring
function findOptimalRecipeWithAlternatives(
  graph: FlowNetwork,
  weightedIngredients: WeightedIngredient[],
  recipes: Recipe[],
  count: number = 4
): RecipeScoreResult[] {
  try {
    const filteredRecipes = graph.filteredRecipes || recipes;
    const preferredMealType = graph.preferredMealType || 'any';

    if (DEBUG_MODE) {
      console.log('\n=== STARTING CORRECTED RECIPE SCORING ===');
      console.log(`Processing ${filteredRecipes.length} recipes for corrected scoring`);
      console.log(`Preferred meal type: ${preferredMealType}`);
      console.log(`Total weighted ingredients: ${weightedIngredients.length}`);
    }

    // Run max flow algorithm
    const { flow, flowPaths } = edmondsKarp(graph, 's', 't');

    // Calculate scores for each recipe using FIXED scoring logic
    const recipeScores = filteredRecipes.map((recipe) => {
      const recipeId = `r_${recipe.id}`;
      const usedIngredientsWithExpiry: UsedIngredientWithExpiry[] = [];
      const matchedIngredientIds = new Set<string>();

      // Get meal type boost
      const mealTypeBoost =
        recipe.mealType === preferredMealType
          ? 2.5
          : recipe.mealType === 'any'
          ? 1.2
          : 0.8;

      // FIXED: Use reasonable threshold (0.7 instead of 0.85)
      weightedIngredients.forEach((ingredient) => {
        const ingredientId = `i_${ingredient.id}`;
        const edgeId = `${ingredientId}-${recipeId}`;

        if (graph.edges[edgeId]) {
          const edge = graph.edges[edgeId];

          // FIXED: Use reasonable threshold (0.7 instead of 0.85)
          if ((edge.flow || 0) > 0 || (edge.matchQuality || 0) >= 0.7) {
            if (!matchedIngredientIds.has(ingredient.id)) {
              matchedIngredientIds.add(ingredient.id);

              const originalIngredient = ingredient.originalIngredient || {};
              const quantity = parseFloat(
                originalIngredient.quantity?.toString() || '1'
              );
              const unit = originalIngredient.unit || 'unit';

              usedIngredientsWithExpiry.push({
                id: ingredient.id,
                name: ingredient.name,
                daysUntilExpiry: ingredient.daysUntilExpiry,
                matchQuality: edge.matchQuality || 0.7,
                matchedWith: edge.matchedWith || null,
                quantity,
                unit,
                quantityFactor:
                  edge.quantityFactor ||
                  Math.min(3, Math.log10(quantity + 1) + 1),
              });

              if (DEBUG_MODE) {
                console.log(`📋 Recipe "${recipe.title}" using ingredient: "${ingredient.name}" -> "${edge.matchedWith}" (quality: ${(edge.matchQuality || 0.7).toFixed(2)})`);
              }
            }
          }
        }
      });

      // FIXED: Calculate correct score using enhanced scoring algorithm
      let finalScore = 0;
      
      if (usedIngredientsWithExpiry.length === 0) {
        // NO MATCHES = LOW SCORE (0-5 points max based on meal type)
        finalScore = mealTypeBoost > 2.0 ? 5 : mealTypeBoost > 1.1 ? 2 : 0;
        
        if (DEBUG_MODE) {
          console.log(`❌ Recipe "${recipe.title}": 0 matches -> Score: ${finalScore}`);
        }
      } else {
        // HAS MATCHES = Use enhanced scoring algorithm
        const calculatedScore = calculateCorrectRecipeScore(
          recipe,
          usedIngredientsWithExpiry,
          mealTypeBoost
        );
        finalScore = calculatedScore;
        
        if (DEBUG_MODE) {
          console.log(`✅ Recipe "${recipe.title}": ${usedIngredientsWithExpiry.length}/${recipe.ingredients.length} matches -> Score: ${finalScore}`);
        }
      }

      // Calculate missing ingredients accurately
      const usedIngredientMatches = new Set<string>();

      // Track matched recipe ingredients by their original form
      usedIngredientsWithExpiry.forEach((ing) => {
        if (ing.matchedWith) {
          usedIngredientMatches.add(ing.matchedWith.toLowerCase());
        }
      });

      // Find truly missing ingredients
      const missedIngredients = recipe.ingredients.filter((recipeIng) => {
        const normalized = recipeIng.toLowerCase();
        return !usedIngredientMatches.has(normalized);
      });

      // De-duplicate the usedIngredients list
      const uniqueUsedIngredients = [...new Set(
        usedIngredientsWithExpiry.map((ing) => ing.matchedWith || ing.name)
      )];

      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        score: Math.round(finalScore),
        mealType: recipe.mealType || 'any',
        usedIngredients: uniqueUsedIngredients,
        missedIngredients,
        instructions: recipe.instructions || [],
        matchCount: uniqueUsedIngredients.length,
        totalIngredients: recipe.ingredients.length,
        expiringIngredients: usedIngredientsWithExpiry.filter(
          (ing) => ing.daysUntilExpiry <= 7
        ).length,
      };
    });

    // Sort by score - recipes with better matches will naturally score higher
    const sortedRecipes = recipeScores.sort((a, b) => b.score - a.score);

    if (DEBUG_MODE) {
      console.log('\n=== FINAL CORRECTED SCORING RESULTS ===');
      
      // Show detailed comparison of top recipes
      sortedRecipes.slice(0, 10).forEach((recipe, index) => {
        const coverage = ((recipe.matchCount || 0) / (recipe.totalIngredients || 1) * 100).toFixed(1);
        console.log(`${index + 1}. "${recipe.title}"`);
        console.log(`   💯 Score: ${recipe.score} points`);
        console.log(`   📊 Coverage: ${coverage}% (${recipe.matchCount}/${recipe.totalIngredients} ingredients)`);
        console.log(`   ⏰ Expiring: ${recipe.expiringIngredients || 0} ingredients`);
        console.log(`   🍽️ Meal type: ${recipe.mealType}`);
        console.log(`   ✅ Available: [${recipe.usedIngredients.slice(0, 3).join(', ')}${recipe.usedIngredients.length > 3 ? '...' : ''}]`);
        console.log(`   ❌ Missing: [${recipe.missedIngredients.slice(0, 3).join(', ')}${recipe.missedIngredients.length > 3 ? '...' : ''}]`);
        console.log('');
      });
      
      console.log('=== SCORING ANALYSIS ===');
      const scores = recipeScores.map(r => r.score);
      console.log(`📈 Score range: ${Math.min(...scores)} - ${Math.max(...scores)} points`);
      console.log(`🚫 Recipes with 0 matches: ${recipeScores.filter(r => r.matchCount === 0).length}`);
      console.log(`🎯 Recipes with perfect coverage: ${recipeScores.filter(r => r.matchCount === r.totalIngredients).length}`);
      console.log(`📊 Average score: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}`);
      console.log('=== END CORRECTED SCORING ===\n');
    }

    return sortedRecipes.slice(0, count);
  } catch (error) {
    console.error('Error in recipe recommendation algorithm:', error);

    // Emergency fallback with low scores
    const mealTypeFilter = graph.preferredMealType || 'any';
    const filteredRecipes =
      mealTypeFilter !== 'any'
        ? recipes.filter(
            (r) => r.mealType === mealTypeFilter || r.mealType === 'any'
          )
        : recipes;

    return filteredRecipes.slice(0, count).map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      score: recipe.mealType === mealTypeFilter ? 5 : 1, // Low emergency scores
      mealType: recipe.mealType || 'any',
      usedIngredients: [],
      missedIngredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      matchCount: 0,
      totalIngredients: recipe.ingredients.length,
      expiringIngredients: 0,
    }));
  }
}

// FIXED: More generous and realistic scoring for good coverage
function calculateCorrectRecipeScore(
  recipe: Recipe,
  usedIngredientsWithExpiry: UsedIngredientWithExpiry[],
  mealTypeBoost: number
): number {
  const totalRecipeIngredients = recipe.ingredients.length;

  // CRITICAL: If no ingredients are used, return very low score
  if (usedIngredientsWithExpiry.length === 0) {
    const noMatchScore = mealTypeBoost > 2.0 ? 2 : mealTypeBoost > 1.1 ? 1 : 0;
    
    if (DEBUG_MODE) {
      console.log(`"${recipe.title}": NO MATCHES -> Score: ${noMatchScore}`);
    }
    return noMatchScore;
  }

  // Calculate coverage ratio and missing ingredients count
  const coverageRatio = usedIngredientsWithExpiry.length / totalRecipeIngredients;
  const missingIngredientsCount = totalRecipeIngredients - usedIngredientsWithExpiry.length;
  
  // Calculate average match quality
  const matchQualitySum = usedIngredientsWithExpiry.reduce(
    (sum, ing) => sum + (ing.matchQuality || 0.7), 0
  );
  const avgMatchQuality = matchQualitySum / usedIngredientsWithExpiry.length;

  // Count expiring ingredients that are ACTUALLY USED in this recipe
  const actualExpiringIngredients = usedIngredientsWithExpiry.filter(
    (ing) => ing.daysUntilExpiry <= 7
  );
  const actualExpiringCount = actualExpiringIngredients.length;
  
  if (DEBUG_MODE) {
    console.log(`"${recipe.title}" - Used: ${usedIngredientsWithExpiry.length}/${totalRecipeIngredients}, Missing: ${missingIngredientsCount}, Actually expiring: ${actualExpiringCount}`);
  }

  // NEW ALGORITHM: More practical scoring based on missing ingredients + coverage
  let baseScore = 0;
  
  // PHASE 1: Base score heavily weighted by missing ingredients count (most important)
  if (missingIngredientsCount === 0) {
    // Perfect match - all ingredients available (90-95 base points)
    baseScore = 90;
  } else if (missingIngredientsCount === 1) {
    // Only 1 missing ingredient (80-87 base points) - HIGHLY PRACTICAL
    baseScore = 80 + Math.min(7, coverageRatio * 7); // 80-87 range
  } else if (missingIngredientsCount === 2) {
    // 2 missing ingredients (65-75 base points) - STILL PRACTICAL
    baseScore = 65 + Math.min(10, coverageRatio * 10); // 65-75 range
  } else if (missingIngredientsCount === 3) {
    // 3 missing ingredients (45-55 base points) - MODERATE
    baseScore = 45 + Math.min(10, coverageRatio * 10); // 45-55 range
  } else if (missingIngredientsCount <= 5) {
    // 4-5 missing ingredients (25-40 base points) - LESS PRACTICAL
    baseScore = 25 + Math.min(15, coverageRatio * 15); // 25-40 range
  } else {
    // 6+ missing ingredients (5-25 base points) - IMPRACTICAL
    baseScore = 5 + Math.min(20, coverageRatio * 20); // 5-25 range
  }

  // PHASE 2: Additional bonuses and adjustments
  
  // HIGH COVERAGE BONUS: Extra points for very high coverage
  let coverageBonus = 0;
  if (coverageRatio >= 0.9) {
    coverageBonus = 8; // 90%+ coverage gets extra 8 points
  } else if (coverageRatio >= 0.8) {
    coverageBonus = 5; // 80%+ coverage gets extra 5 points
  } else if (coverageRatio >= 0.7) {
    coverageBonus = 3; // 70%+ coverage gets extra 3 points
  }

  // SHOPPING CONVENIENCE BONUS: Heavily reward recipes with very few missing ingredients
  let shoppingBonus = 0;
  if (missingIngredientsCount === 0) {
    shoppingBonus = 10; // Perfect - no shopping needed
  } else if (missingIngredientsCount === 1) {
    shoppingBonus = 8; // Only need to buy 1 thing - very convenient
  } else if (missingIngredientsCount === 2) {
    shoppingBonus = 5; // Only need to buy 2 things - still convenient
  } else if (missingIngredientsCount === 3) {
    shoppingBonus = 2; // Need to buy 3 things - moderate
  }
  // No bonus for 4+ missing ingredients

  // MATCH QUALITY ADJUSTMENT: Slight adjustment for match quality
  const qualityAdjustment = (avgMatchQuality - 0.7) * 3; // ±3 points max
  
  // EXPIRY BONUS: Reward using expiring ingredients (but don't make it overwhelming)
  const expiryBonus = Math.min(10, actualExpiringCount * 2); // Max 10 points for expiry
  
  // MEAL TYPE BONUS: Small bonus for matching preferred meal type
  let mealTypeBonus = 0;
  if (mealTypeBoost > 2.0) {
    mealTypeBonus = 4; // 4 points max for preferred meal type
  } else if (mealTypeBoost > 1.1) {
    mealTypeBonus = 2; // 2 points for any meal type match
  }

  // SMALL RECIPE SIZE BONUS: Slightly favor smaller recipes (easier to make)
  let recipeSizeBonus = 0;
  if (totalRecipeIngredients <= 4) {
    recipeSizeBonus = 2; // Simple recipes get 2 points
  } else if (totalRecipeIngredients <= 6) {
    recipeSizeBonus = 1; // Medium recipes get 1 point
  }
  
  // Calculate final score
  const finalScore = Math.max(0, 
    baseScore + 
    coverageBonus + 
    shoppingBonus + 
    qualityAdjustment + 
    expiryBonus + 
    mealTypeBonus + 
    recipeSizeBonus
  );
  
  // Cap at 100 to prevent inflation
  const cappedScore = Math.min(100, finalScore);

  if (DEBUG_MODE) {
    console.log(`\n🔍 "${recipe.title}" REVISED PRACTICAL SCORING:`);
    console.log(`   📊 Coverage: ${(coverageRatio * 100).toFixed(1)}% (${usedIngredientsWithExpiry.length}/${totalRecipeIngredients})`);
    console.log(`   🛒 Missing ingredients: ${missingIngredientsCount}`);
    console.log(`   🎯 Base score (missing-weighted): ${baseScore.toFixed(1)} points`);
    console.log(`   📈 Coverage bonus: ${coverageBonus} points`);
    console.log(`   🛍️ Shopping convenience bonus: ${shoppingBonus} points`);
    console.log(`   ⚡ Quality adjustment: ${qualityAdjustment.toFixed(1)} points`);
    console.log(`   ⏰ Expiry bonus: ${expiryBonus} points (${actualExpiringCount} expiring)`);
    console.log(`   🍽️ Meal type bonus: ${mealTypeBonus} points`);
    console.log(`   📝 Recipe size bonus: ${recipeSizeBonus} points`);
    console.log(`   💯 FINAL PRACTICAL SCORE: ${cappedScore.toFixed(1)} points`);
    console.log(`   🏆 Expected ranking: ${missingIngredientsCount <= 1 ? 'TOP TIER' : missingIngredientsCount <= 2 ? 'HIGH' : missingIngredientsCount <= 3 ? 'MEDIUM' : 'LOW'}`);
  }

  return Math.round(cappedScore);
}

// Edmonds-Karp algorithm for finding maximum flow in a network
function edmondsKarp(
  graph: FlowNetwork,
  source: string,
  sink: string
): EdmondsKarpResult {
  try {
    const { vertices, edges } = graph;
    let flow = 0;
    const flowPaths: Array<string[]> = [];

    // Create residual network
    const residualEdges: Record<string, Edge> = JSON.parse(
      JSON.stringify(edges)
    );

    // Add reverse edges
    Object.keys(edges).forEach((edgeId) => {
      const [from, to] = edgeId.split('-');
      const reverseEdgeId = `${to}-${from}`;
      if (!residualEdges[reverseEdgeId]) {
        residualEdges[reverseEdgeId] = {
          capacity: 0,
          flow: 0,
          expiryWeight: edges[edgeId].expiryWeight || 0,
        };
      }
    });

    // Find augmenting paths
    let path: string[] | null;
    let pathCount = 0;
    const maxPaths = 100;

    while (
      pathCount < maxPaths &&
      (path = bfs(vertices, residualEdges, source, sink))
    ) {
      pathCount++;
      flowPaths.push(path);

      // Find minimum capacity in path
      let minCapacity = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        const edgeId = `${path[i]}-${path[i + 1]}`;
        minCapacity = Math.min(
          minCapacity,
          residualEdges[edgeId].capacity - residualEdges[edgeId].flow
        );
      }

      // Update flow values
      for (let i = 0; i < path.length - 1; i++) {
        const edgeId = `${path[i]}-${path[i + 1]}`;
        const reverseEdgeId = `${path[i + 1]}-${path[i]}`;

        residualEdges[edgeId].flow += minCapacity;
        residualEdges[reverseEdgeId].flow -= minCapacity;
      }

      flow += minCapacity;
    }

    // Update original graph with flow values
    Object.keys(residualEdges).forEach((edgeId) => {
      if (edges[edgeId]) edges[edgeId].flow = residualEdges[edgeId].flow;
    });

    return { flow, flowPaths };
  } catch (error) {
    console.error('Error in Edmonds-Karp algorithm:', error);
    return { flow: 0, flowPaths: [] };
  }
}

// BFS to find augmenting paths in the residual graph
function bfs(
  vertices: string[],
  edges: Record<string, Edge>,
  source: string,
  sink: string
): string[] | null {
  try {
    const queue: string[] = [source];
    const visited: Record<string, boolean> = { [source]: true };
    const parent: Record<string, string> = {};

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === sink) {
        // Reconstruct path
        const path: string[] = [sink];
        let node = sink;
        while (node !== source) {
          node = parent[node];
          path.unshift(node);
        }
        return path;
      }

      // Check outgoing edges
      for (const vertex of vertices) {
        if (visited[vertex]) continue;

        const edgeId = `${current}-${vertex}`;
        const edge = edges[edgeId];

        if (edge && edge.capacity > edge.flow) {
          visited[vertex] = true;
          parent[vertex] = current;
          queue.push(vertex);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error in BFS algorithm:', error);
    return null;
  }
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(a: string, b: string): number {
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;

  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1, // substitution
              matrix[i][j - 1] + 1, // insertion
              matrix[i - 1][j] + 1 // deletion
            );
    }
  }

  return matrix[b.length][a.length];
}

export {
  buildFlowNetwork,
  findOptimalRecipeWithAlternatives,
  edmondsKarp,
  levenshteinDistance,
  // Exporting interface types for use in other files
  type WeightedIngredient,
  type Recipe,
  type RecipeScoreResult,
  type FlowNetwork,
};