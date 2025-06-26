// backend/src/utils/maxFlow.ts

import IngredientMatcher from './ingredientMatcher';

// Define interfaces for the algorithm

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

// UPDATED: Enhanced ingredient matching function using IngredientMatcher
function findBestIngredientMatch(
  ingredientName: string,
  recipeIngredients: string[]
): IngredientMatch {
  // Use the enhanced matcher
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

  // UPDATED: Connect ingredients to recipes with enhanced matching
  filteredRecipes.forEach((recipe) => {
    const recipeId = `r_${recipe.id}`;
    const mealTypeBoost =
      recipe.mealType === preferredMealType
        ? 2.5 // Increased from 2.0 for stronger meal type preference
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

      // UPDATED: More flexible threshold (was 0.6, now 0.6 with better confidence scaling)
      if (bestMatch.quality >= 0.6) {
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

        // ENHANCED: Scale weight by match quality and add quality bonus
        const qualityBonus = bestMatch.quality >= 0.9 ? 1.2 : 1.0; // Bonus for high-quality matches
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
          console.log(`✅ Enhanced match: "${ingredient.name}" -> "${bestMatch.ingredient}" (quality: ${bestMatch.quality.toFixed(2)})`);
        }
      } else if (DEBUG_MODE) {
        console.log(`❌ No sufficient match for "${ingredient.name}" (best quality: ${bestMatch.quality.toFixed(2)})`);
      }
    });

    // Connect recipe to sink with improved recipe evaluation
    const edgeId = `${recipeId}-t`;
    const totalRecipeIngredients = recipe.ingredients.length || 1;
    const coverageRatio = Math.min(
      1.0,
      matchedIngredients.length / totalRecipeIngredients
    );

    // ENHANCED: Calculate recipe importance with match quality consideration
    const avgMatchQuality = matchedIngredients.length > 0
      ? matchedIngredients.reduce((sum, ing) => sum + ing.matchQuality, 0) / matchedIngredients.length
      : 0;
    
    const recipeImportance = calculateRecipeImportance(
      matchedIngredients,
      mealTypeBoost,
      totalRecipeIngredients
    ) * (0.8 + avgMatchQuality * 0.2); // Boost for high-quality matches

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

    if (DEBUG_MODE && matchedIngredients.length > 0) {
      console.log(`📝 Recipe "${recipe.title}": ${matchedIngredients.length}/${totalRecipeIngredients} ingredients matched (avg quality: ${avgMatchQuality.toFixed(2)})`);
    }
  });

  // Create the network
  const network = {
    vertices,
    edges,
    filteredRecipes,
    preferredMealType,
  };

  // Add nutrition nodes
  return addNutritionNodes(network);
}

// Function to add nutrition balance nodes to the network
function addNutritionNodes(network: FlowNetwork): FlowNetwork {
  // Nutrition categories
  const nutritionCategories: NutritionCategory[] = ['protein', 'vegetables', 'grains', 'dairy'];
  
  // Nutrition keywords for classification
  const nutritionKeywords: Record<NutritionCategory, string[]> = {
    protein: [
      'meat',
      'chicken',
      'beef',
      'pork',
      'fish',
      'tofu',
      'lentil',
      'bean',
      'egg',
      'nuts',
      'seed',
      'protein',
    ],
    vegetables: [
      'vegetable',
      'carrot',
      'broccoli',
      'spinach',
      'kale',
      'tomato',
      'pepper',
      'onion',
      'lettuce',
      'cabbage',
      'zucchini',
      'eggplant',
      'cucumber',
      'avocado',
    ],
    grains: [
      'rice',
      'pasta',
      'bread',
      'flour',
      'oat',
      'grain',
      'wheat',
      'quinoa',
      'barley',
      'cereal',
      'corn',
      'couscous',
      'tortilla',
    ],
    dairy: [
      'milk',
      'cheese',
      'yogurt',
      'cream',
      'butter',
      'dairy',
      'cheddar',
      'mozzarella',
      'parmesan',
    ],
  };

  if (DEBUG_MODE) {
    console.log('Adding nutrition nodes to flow network');
  }

  // Add nutrition category vertices
  nutritionCategories.forEach((category) => {
    const nutriVertexId = `n_${category}`;
    network.vertices.push(nutriVertexId);

    // Connect relevant recipes to nutrition categories
    network.filteredRecipes?.forEach((recipe) => {
      const recipeVertexId = `r_${recipe.id}`;

      // Count how many ingredients in this recipe match this nutrition category
      const matchCount = recipe.ingredients.filter((ing) => {
        const ingredientName = ing.toLowerCase();
        return nutritionKeywords[category].some((keyword) =>
          ingredientName.includes(keyword)
        );
      }).length;

      if (matchCount > 0) {
        const edgeId = `${nutriVertexId}-${recipeVertexId}`;

        network.edges[edgeId] = {
          capacity: matchCount,
          flow: 0,
          nutritionBoost: Math.min(1.5, 0.8 + matchCount * 0.2),
          nutritionCategory: category,
        };

        if (DEBUG_MODE) {
          console.log(
            `Connected nutrition ${category} to recipe ${recipe.title} with ${matchCount} matches`
          );
        }
      }
    });
  });

  // Add balanced meal bonus node
  const balancedNodeId = 'balanced_meal';
  network.vertices.push(balancedNodeId);

  // Connect to recipes with multiple nutrition categories
  network.filteredRecipes?.forEach((recipe) => {
    const recipeVertexId = `r_${recipe.id}`;

    // Count how many nutrition categories are present in this recipe
    const nutritionCategoriesPresent = nutritionCategories.filter(
      (category) => {
        const nutriVertexId = `n_${category}`;
        const edgeId = `${nutriVertexId}-${recipeVertexId}`;

        return network.edges[edgeId] !== undefined;
      }
    ).length;

    if (nutritionCategoriesPresent >= 2) {
      // Present in at least 2 categories
      const edgeId = `${balancedNodeId}-${recipeVertexId}`;

      // Scale the boost by the number of nutrition categories present
      const balancedBoost = 1.0 + nutritionCategoriesPresent * 0.2; // 1.4 for 2 categories, up to 1.8 for all 4

      network.edges[edgeId] = {
        capacity: nutritionCategoriesPresent,
        flow: 0,
        balancedMealBoost: balancedBoost,
      };

      if (DEBUG_MODE) {
        console.log(
          `Recipe ${recipe.title} has ${nutritionCategoriesPresent} nutrition categories - balanced meal boost: ${balancedBoost}`
        );
      }
    }
  });

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
  // Binary approach: significant boost if about to expire (<=7 days), otherwise normal weight
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
  // Refined balance for different factors
  const expiryWeight = expiryFactor * 0.45; // Increased weight for expiry
  const matchWeight = matchQuality * 0.15; // Reasonable weight for match quality
  const mealTypeWeight = mealTypeBoost * 0.2 * quantityFactor; // Factor in meal type and quantity
  const baseFactorWeight = baseWeight * 0.2; // Base ingredient weight

  // Combined score with improved balance
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

  // Calculate average urgency of matched ingredients with higher weight
  let totalUrgency = 0;
  matchedIngredients.forEach((ingredient) => {
    const expiryUrgency = Math.max(1, 10 - (ingredient.daysUntilExpiry || 0));
    totalUrgency += (ingredient.adjustedWeight || 1) * (expiryUrgency / 10);
  });

  // Calculate match percentage with better weighting
  const matchPercentage = matchedIngredients.length / totalIngredients;

  // Combine factors with expiry urgency having higher importance
  return (totalUrgency * 0.6 + matchPercentage * 0.4) * mealTypeBoost;
}

// Find optimal recipe and alternatives using Edmonds-Karp algorithm
// CRITICAL FIX: Replace the findOptimalRecipeWithAlternatives function in maxFlow.ts
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
      console.log('\n=== STARTING RECIPE SCORING ===');
      console.log(`Processing ${filteredRecipes.length} recipes`);
    }

    // Run max flow algorithm
    const { flow, flowPaths } = edmondsKarp(graph, 's', 't');

    // Calculate scores for each recipe
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

      // Find ingredients connected to this recipe
      weightedIngredients.forEach((ingredient) => {
        const ingredientId = `i_${ingredient.id}`;
        const edgeId = `${ingredientId}-${recipeId}`;

        if (graph.edges[edgeId]) {
          const edge = graph.edges[edgeId];

          // Consider ingredient as used if positive flow or high match quality
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
            }
          }
        }
      });

      // FIXED: Calculate realistic score based on actual matches
      let finalScore = 0;
      
      if (usedIngredientsWithExpiry.length === 0) {
        // NO MATCHES = VERY LOW SCORE (0-3 points max)
        finalScore = mealTypeBoost > 2.0 ? 3 : 1; // Tiny boost for correct meal type
        
        if (DEBUG_MODE) {
          console.log(`Recipe "${recipe.title}": 0 matches, score = ${finalScore}`);
        }
      } else {
        // HAS MATCHES = Use proper scoring algorithm
        const normalizedScore = calculateRecipeScore(
          recipe,
          usedIngredientsWithExpiry,
          mealTypeBoost,
          { categories: [], boosts: {} },
          1.0
        );
        finalScore = normalizedScore;
        
        if (DEBUG_MODE) {
          console.log(`Recipe "${recipe.title}": ${usedIngredientsWithExpiry.length} matches, calculated score = ${finalScore}`);
        }
      }

      // Calculate missing ingredients more accurately
      const usedIngredientMatches = new Set<string>();

      // Track matched recipe ingredients by their original form
      usedIngredientsWithExpiry.forEach((ing) => {
        if (ing.matchedWith) {
          usedIngredientMatches.add(ing.matchedWith.toLowerCase());
        }
      });

      // Find truly missing ingredients (not covered by any inventory item)
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
        score: Math.round(finalScore), // Use the calculated score directly
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

    // FIXED: Sort by score - recipes with matches will naturally score higher
    const sortedRecipes = recipeScores.sort((a, b) => b.score - a.score);

    // REMOVED: No fallback logic that gives high scores to no-match recipes
    // REMOVED: No score normalization that messes up the scores

    if (DEBUG_MODE) {
      console.log('\n=== FINAL SCORING RESULTS ===');
      sortedRecipes.slice(0, Math.min(10, sortedRecipes.length)).forEach((recipe, index) => {
        console.log(`${index + 1}. "${recipe.title}": ${recipe.score} points (${recipe.matchCount}/${recipe.totalIngredients} ingredients)`);
      });
      console.log('=== END SCORING RESULTS ===\n');
    }

    // Return top results
    return sortedRecipes.slice(0, count);
  } catch (error) {
    console.error('Error in recipe recommendation algorithm:', error);

    // FIXED: Emergency fallback with realistic scores
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
      score: recipe.mealType === mealTypeFilter ? 2 : 1, // VERY LOW emergency scores
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

// Calculate recipe score with improved balance between factors
function calculateRecipeScore(
  recipe: Recipe,
  usedIngredientsWithExpiry: UsedIngredientWithExpiry[],
  mealTypeBoost: number,
  nutritionInfo: {
    categories: string[];
    boosts: Record<string, number>;
  } = { categories: [], boosts: {} },
  balancedMealBoost: number = 1.0
): number {
  const totalRecipeIngredients = recipe.ingredients.length;

  // CRITICAL: If no ingredients are used, return almost zero score
  if (usedIngredientsWithExpiry.length === 0) {
    const noMatchScore = mealTypeBoost > 2.0 ? 2 : 0; // Max 2 points for correct meal type, 0 otherwise
    
    if (DEBUG_MODE) {
      console.log(`"${recipe.title}": NO MATCHES -> Score: ${noMatchScore}`);
    }
    return noMatchScore;
  }

  // Calculate coverage ratio (most important factor)
  const coverageRatio = usedIngredientsWithExpiry.length / totalRecipeIngredients;
  
  // Calculate match quality
  const matchQualitySum = usedIngredientsWithExpiry.reduce(
    (sum, ing) => sum + (ing.matchQuality || 0.7), 0
  );
  const avgMatchQuality = matchQualitySum / usedIngredientsWithExpiry.length;

  // Count expiring ingredients
  const expiringIngredients = usedIngredientsWithExpiry.filter(
    (ing) => ing.daysUntilExpiry <= 7
  );

  // SIMPLE AND DIRECT SCORING
  
  // Base score: Purely based on how many ingredients we have (0-80 points)
  const baseScore = coverageRatio * 80;
  
  // Quality bonus: High-quality matches get small bonus (0-10 points)
  const qualityBonus = avgMatchQuality * 10;
  
  // Expiry bonus: Using expiring ingredients (0-5 points)
  const expiryBonus = (expiringIngredients.length / usedIngredientsWithExpiry.length) * 5;
  
  // Perfect match bonus: Having ALL ingredients (0-5 points)
  const perfectBonus = coverageRatio >= 1.0 ? 5 : 0;
  
  // Calculate score before meal type boost
  const scoreBeforeMealType = baseScore + qualityBonus + expiryBonus + perfectBonus;
  
  // Apply meal type boost (multiplicative for the bonus portion)
  const mealTypeBonus = scoreBeforeMealType * (mealTypeBoost - 1.0);
  const finalScore = scoreBeforeMealType + mealTypeBonus;
  
  // Cap at 100
  const cappedScore = Math.min(100, Math.max(0, finalScore));

  if (DEBUG_MODE) {
    console.log(`"${recipe.title}": ${usedIngredientsWithExpiry.length}/${totalRecipeIngredients} ingredients -> Coverage: ${(coverageRatio * 100).toFixed(0)}% -> Base: ${baseScore.toFixed(0)} -> Final: ${cappedScore.toFixed(0)}`);
  }

  return cappedScore;
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
    const maxPaths = 100; // Limit path count to prevent infinite loops

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

    return null; // No path found
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