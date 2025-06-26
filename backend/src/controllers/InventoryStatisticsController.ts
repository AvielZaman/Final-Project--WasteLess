// backend/src/controllers/InventoryStatisticsController.ts
import { Request, Response } from 'express';
import Ingredient, {
  IngredientCategory,
  IngredientStatus,
} from '../models/ingredient';
import { SurveyResponse, RecipeUsage } from '../models/survey';
import { startOfMonth, subMonths, format, isAfter, isBefore } from 'date-fns';

// IMPROVED: Function to update expiry statuses before calculating statistics
const updateExpiryStatusesForStats = async (userId: string) => {
  const today = new Date();
  
  // Mark expired items
  const expiredUpdateResult = await Ingredient.updateMany(
    {
      userId,
      status: { $in: [IngredientStatus.AVAILABLE, null, undefined] },
      expiryDate: { $ne: null, $lt: today },
    },
    {
      $set: {
        status: IngredientStatus.EXPIRED,
        aboutToExpire: false,
      },
    }
  );

  console.log(`Statistics update: Marked ${expiredUpdateResult.modifiedCount} items as expired for user ${userId}`);
  return expiredUpdateResult.modifiedCount;
};

// Generate smart recommendations based on user patterns
const generateSmartRecommendations = (
  categoryStats: any[],
  mostWastedIngredients: any[],
  mostUsedIngredients: any[],
  summaryStats: any
) => {
  const recommendations: string[] = [];

  // Recommendation 1: Most wasted category
  if (categoryStats.length > 0) {
    const mostWastedCategory = categoryStats.reduce((prev, current) => 
      (prev.wastedCount > current.wastedCount) ? prev : current
    );
    
    if (mostWastedCategory.wastedCount > 0) {
      recommendations.push(
        `Consider buying smaller quantities of ${mostWastedCategory._id} items - you've wasted ${mostWastedCategory.wastedCount} items in this category.`
      );
    }
  }

  // Recommendation 2: Most wasted specific ingredients
  if (mostWastedIngredients.length > 0) {
    const topWasted = mostWastedIngredients[0];
    if (topWasted.wastedCount > 1) {
      recommendations.push(
        `You frequently waste "${topWasted.name}" (${topWasted.wastedCount} times). Try buying smaller quantities or using it in recipes sooner.`
      );
    }
  }

  // Recommendation 3: Food utilization improvement
  if (summaryStats.foodUtilizationRate < 70) {
    recommendations.push(
      `Your food utilization rate is ${summaryStats.foodUtilizationRate}%. Try using our recipe recommendations to use ingredients before they expire.`
    );
  } else if (summaryStats.foodUtilizationRate >= 80) {
    recommendations.push(
      `Excellent! You're utilizing ${summaryStats.foodUtilizationRate}% of your food. Keep up the great work!`
    );
  }

  // Recommendation 4: Recipe usage
  if (summaryStats.recipesUsed < 5) {
    recommendations.push(
      `Try using more recipe recommendations - they help you consume ingredients before they expire. You've only used ${summaryStats.recipesUsed} recipes so far.`
    );
  } else {
    recommendations.push(
      `Great job using ${summaryStats.recipesUsed} recipes! This helps reduce food waste significantly.`
    );
  }

  // Recommendation 5: Items used before expiry
  const beforeExpiryRate = summaryStats.consumedItems > 0 
    ? Math.round((summaryStats.itemsUsedBeforeExpiry / summaryStats.consumedItems) * 100)
    : 0;
  
  if (beforeExpiryRate < 80 && summaryStats.consumedItems > 0) {
    recommendations.push(
      `Only ${beforeExpiryRate}% of your consumed items were used before expiry. Try to use items sooner or adjust your shopping habits.`
    );
  }

  // Recommendation 6: Trend-based advice
  if (summaryStats.improvementFromLastMonth > 0) {
    recommendations.push(
      `You've improved your waste reduction by ${summaryStats.improvementFromLastMonth}% from last month. Keep up the momentum!`
    );
  }

  // If no specific recommendations, add general ones
  if (recommendations.length === 0) {
    recommendations.push("Start by tracking which items you waste most frequently.");
    recommendations.push("Use the recipe recommendation feature to make the most of your ingredients.");
    recommendations.push("Check your inventory regularly to see what's expiring soon.");
  }

  return recommendations.slice(0, 6); // Limit to 6 recommendations
};

// Get detailed inventory statistics with REAL data
const getInventoryStatistics = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { timeRange = 'alltime' } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // IMPROVED: Update expired items before calculating statistics
    await updateExpiryStatusesForStats(userId);

    // Calculate the start date based on the time range
    let startDate = new Date(0); // Default to epoch start for "all time"

    if (timeRange === '30days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === '3months') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
    } else if (timeRange === '6months') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
    } else if (timeRange === '1year') {
      startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Base filter for all queries
    const baseFilter = {
      userId,
      createdAt: { $gte: startDate },
    };

    // FIXED: Calculate category statistics - REAL DATA with proper expired item handling
    const categoryStats = await Ingredient.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          // Count consumed items (successfully used)
          usedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', IngredientStatus.CONSUMED] }, 1, 0],
            },
          },
          // FIXED: Count wasted items (expired OR manually marked as wasted)
          wastedCount: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', IngredientStatus.EXPIRED] },
                    { $eq: ['$status', IngredientStatus.WASTED] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // FIXED: Get most wasted ingredients - include EXPIRED items
    const mostWastedIngredients = await Ingredient.aggregate([
      {
        $match: {
          ...baseFilter,
          // FIXED: Include both EXPIRED and WASTED status
          status: { $in: [IngredientStatus.EXPIRED, IngredientStatus.WASTED] },
        },
      },
      {
        $group: {
          _id: { name: '$name', category: '$category' },
          wastedCount: { $sum: 1 },
          totalQuantityWasted: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'ingredients',
          let: { ingredientName: '$_id.name' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$name', '$$ingredientName'] },
                userId: userId,
                createdAt: { $gte: startDate },
              },
            },
            { $count: 'total' },
          ],
          as: 'totalData',
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id.name',
          category: '$_id.category',
          wastedCount: 1,
          totalQuantityWasted: 1,
          wastePercentage: {
            $multiply: [
              {
                $divide: [
                  '$wastedCount',
                  { $ifNull: [{ $arrayElemAt: ['$totalData.total', 0] }, 1] },
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { wastedCount: -1 } },
      { $limit: 10 },
    ]);

    // Get most consumed ingredients - REAL DATA
    const mostUsedIngredients = await Ingredient.aggregate([
      {
        $match: {
          ...baseFilter,
          status: IngredientStatus.CONSUMED,
        },
      },
      {
        $group: {
          _id: { name: '$name', category: '$category' },
          consumedCount: { $sum: 1 },
          totalQuantityConsumed: { $sum: '$quantity' },
        },
      },
      {
        $lookup: {
          from: 'ingredients',
          let: { ingredientName: '$_id.name' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$name', '$$ingredientName'] },
                userId: userId,
                createdAt: { $gte: startDate },
              },
            },
            { $count: 'total' },
          ],
          as: 'totalData',
        },
      },
      {
        $project: {
          _id: 0,
          name: '$_id.name',
          category: '$_id.category',
          consumedCount: 1,
          totalQuantityConsumed: 1,
          consumedPercentage: {
            $multiply: [
              {
                $divide: [
                  '$consumedCount',
                  { $ifNull: [{ $arrayElemAt: ['$totalData.total', 0] }, 1] },
                ],
              },
              100,
            ],
          },
        },
      },
      { $sort: { consumedCount: -1 } },
      { $limit: 10 },
    ]);

    // Calculate monthly trends for the last 6 months - REAL DATA
    const monthlyTrends = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const nextMonthStart = startOfMonth(subMonths(now, i - 1));

      const monthlyStats = await Ingredient.aggregate([
        {
          $match: {
            userId,
            createdAt: {
              $gte: monthStart,
              $lt: nextMonthStart,
            },
          },
        },
        {
          $facet: {
            total: [{ $count: 'count' }],
            // FIXED: Include expired items in wasted count
            wasted: [
              {
                $match: {
                  status: {
                    $in: [IngredientStatus.EXPIRED, IngredientStatus.WASTED],
                  },
                },
              },
              { $count: 'count' },
            ],
            consumed: [
              {
                $match: {
                  status: IngredientStatus.CONSUMED,
                },
              },
              { $count: 'count' },
            ],
          },
        },
      ]);

      const totalCount = monthlyStats[0].total[0]?.count || 0;
      const wastedCount = monthlyStats[0].wasted[0]?.count || 0;
      const consumedCount = monthlyStats[0].consumed[0]?.count || 0;
      const wastePercentage =
        totalCount > 0 ? Math.round((wastedCount / totalCount) * 100) : 0;

      monthlyTrends.push({
        month: format(monthStart, 'MMM'),
        year: monthStart.getFullYear(),
        totalItems: totalCount,
        wastedItems: wastedCount,
        consumedItems: consumedCount,
        wastePercentage: wastePercentage,
      });
    }

    // FIXED: Calculate summary statistics - include expired items properly
    const totalItems = await Ingredient.countDocuments(baseFilter);

    // FIXED: Count both expired and wasted items
    const wastedItems = await Ingredient.countDocuments({
      ...baseFilter,
      status: { $in: [IngredientStatus.EXPIRED, IngredientStatus.WASTED] },
    });

    const consumedItems = await Ingredient.countDocuments({
      ...baseFilter,
      status: IngredientStatus.CONSUMED,
    });

    // Items used before expiration
    const itemsUsedBeforeExpiry = await Ingredient.countDocuments({
      ...baseFilter,
      status: IngredientStatus.CONSUMED,
      consumedDate: { $exists: true },
      expiryDate: { $exists: true },
      $expr: { $lt: ['$consumedDate', '$expiryDate'] },
    });

    // FIXED: Calculate waste percentage including expired items
    const wastePercentage =
      totalItems > 0 ? Math.round((wastedItems / totalItems) * 100) : 0;

    // Find most wasted category
    let mostWastedCategory = 'None';
    let highestWasteCount = 0;

    categoryStats.forEach((cat) => {
      if (cat.wastedCount > highestWasteCount) {
        highestWasteCount = cat.wastedCount;
        mostWastedCategory = cat._id;
      }
    });

    // Find most used category
    let mostUsedCategory = 'None';
    let highestUsedCount = 0;

    categoryStats.forEach((cat) => {
      if (cat.usedCount > highestUsedCount) {
        highestUsedCount = cat.usedCount;
        mostUsedCategory = cat._id;
      }
    });

    // Calculate improvement from last month
    const currentMonthWaste =
      monthlyTrends[monthlyTrends.length - 1]?.wastePercentage || 0;
    const lastMonthWaste =
      monthlyTrends[monthlyTrends.length - 2]?.wastePercentage || 0;
    const improvementFromLastMonth = Math.max(
      0,
      lastMonthWaste - currentMonthWaste
    );

    // Calculate six-month waste reduction
    const sixMonthsAgoWaste = monthlyTrends[0]?.wastePercentage || 0;
    const wasteReductionSixMonths = Math.max(
      0,
      sixMonthsAgoWaste - currentMonthWaste
    );

    // Get recipe usage statistics
    const recipeUsageStats = await RecipeUsage.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRecipesUsed: { $sum: 1 },
          recommendedRecipesUsed: {
            $sum: { $cond: ['$wasRecommended', 1, 0] },
          },
        },
      },
    ]);

    const recipesUsed = recipeUsageStats[0]?.totalRecipesUsed || 0;
    const recommendedRecipesUsed = recipeUsageStats[0]?.recommendedRecipesUsed || 0;

    // Build summary stats
    const summaryStats = {
      totalItems,
      wastedItems,
      consumedItems,
      wastePercentage,
      mostWastedCategory,
      mostUsedCategory,
      improvementFromLastMonth,
      itemsUsedBeforeExpiry,
      wasteReductionSixMonths,
      recipesUsed,
      recommendedRecipesUsed,
      foodUtilizationRate: totalItems > 0 ? Math.round((consumedItems / totalItems) * 100) : 0,
    };

    // IMPROVED: Generate smart recommendations based on actual data
    const smartRecommendations = generateSmartRecommendations(
      categoryStats,
      mostWastedIngredients,
      mostUsedIngredients,
      summaryStats
    );

    // Return the compiled statistics
    res.status(200).json({
      categoryStats,
      mostWastedIngredients,
      mostUsedIngredients,
      monthlyTrends,
      summaryStats,
      smartRecommendations, // NEW: Include smart recommendations
    });
  } catch (error) {
    console.error('Error fetching inventory statistics:', error);
    res.status(500).json({ message: 'Error fetching inventory statistics' });
  }
};

// Get additional metrics endpoint
const getAdditionalMetrics = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { timeRange = 'alltime' } = req.query;

    let startDate = new Date(0);
    if (timeRange === '30days') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    } else if (timeRange === '6months') {
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
    }

    // Food waste reduction metrics
    const wasteReductionMetrics = await Ingredient.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $facet: {
          usedBeforeExpiry: [
            {
              $match: {
                status: IngredientStatus.CONSUMED,
                consumedDate: { $exists: true },
                expiryDate: { $exists: true },
                $expr: { $lt: ['$consumedDate', '$expiryDate'] },
              },
            },
            { $count: 'count' },
          ],
          totalUsed: [
            {
              $match: {
                status: IngredientStatus.CONSUMED,
              },
            },
            { $count: 'count' },
          ],
        },
      },
    ]);

    const usedBeforeExpiryCount = wasteReductionMetrics[0].usedBeforeExpiry[0]?.count || 0;
    const totalUsedCount = wasteReductionMetrics[0].totalUsed[0]?.count || 0;

    // Engagement metrics
    const engagementMetrics = await RecipeUsage.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalRecipesSuggested: { $sum: { $cond: ['$wasRecommended', 1, 0] } },
          totalRecipesUsed: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      wasteReductionMetrics: {
        itemsUsedBeforeExpiry: usedBeforeExpiryCount,
        totalItemsUsed: totalUsedCount,
        percentageUsedBeforeExpiry:
          totalUsedCount > 0 ? Math.round((usedBeforeExpiryCount / totalUsedCount) * 100) : 0,
      },
      engagementMetrics: {
        recipeSuggestionsUsed: engagementMetrics[0]?.totalRecipesSuggested || 0,
        totalRecipesUsed: engagementMetrics[0]?.totalRecipesUsed || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching additional metrics:', error);
    res.status(500).json({ message: 'Error fetching additional metrics' });
  }
};

export default {
  getInventoryStatistics,
  getAdditionalMetrics,
};