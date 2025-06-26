// backend/src/controllers/InventoryController.ts
import { Request, Response } from 'express';
import Ingredient, {
  IngredientCategory,
  IngredientStatus,
} from '../models/ingredient';

// IMPROVED: Function to update expiry statuses
const updateExpiryStatuses = async (userId: string | undefined) => {
  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // STEP 1: Mark expired items (items that have already expired)
  const expiredUpdateResult = await Ingredient.updateMany(
    {
      userId,
      status: { $in: [IngredientStatus.AVAILABLE, null, undefined] },
      expiryDate: { $ne: null, $lt: today }, // Less than today (expired)
    },
    {
      $set: {
        status: IngredientStatus.EXPIRED,
        aboutToExpire: false,
      },
    }
  );

  console.log(`Marked ${expiredUpdateResult.modifiedCount} items as expired for user ${userId}`);

  // STEP 2: Mark items about to expire (expiring within 3 days but not yet expired)
  const aboutToExpireResult = await Ingredient.updateMany(
    {
      userId,
      status: { $in: [IngredientStatus.AVAILABLE, null, undefined] },
      expiryDate: { $ne: null, $lte: threeDaysFromNow, $gte: today }, // Between today and 3 days from now
    },
    { $set: { aboutToExpire: true } }
  );

  console.log(`Marked ${aboutToExpireResult.modifiedCount} items as about to expire for user ${userId}`);

  // STEP 3: Reset flag for ingredients that are not about to expire
  const resetFlagResult = await Ingredient.updateMany(
    {
      userId,
      status: { $in: [IngredientStatus.AVAILABLE, null, undefined] },
      $or: [{ expiryDate: null }, { expiryDate: { $gt: threeDaysFromNow } }],
    },
    { $set: { aboutToExpire: false } }
  );

  console.log(`Reset aboutToExpire flag for ${resetFlagResult.modifiedCount} items for user ${userId}`);

  return {
    expiredCount: expiredUpdateResult.modifiedCount,
    aboutToExpireCount: aboutToExpireResult.modifiedCount,
    resetCount: resetFlagResult.modifiedCount
  };
};

// Get all ingredients in the user's inventory
const getUserInventory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    // IMPROVED: Update expiry statuses before fetching
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: userId missing' });
    }
    await updateExpiryStatuses(userId);

    // Optional filtering by category
    const { category } = req.query;
    const filter: any = {
      userId,
      $or: [
        { status: IngredientStatus.AVAILABLE },
        { status: IngredientStatus.EXPIRED },
        { status: null },
        { status: { $exists: false } },
      ],
    };

    if (
      category &&
      Object.values(IngredientCategory).includes(category as IngredientCategory)
    ) {
      filter.category = category;
    }

    const ingredients = await Ingredient.find(filter).sort({
      // Sort by expiry date (asc) and then by purchase date (desc)
      expiryDate: 1,
      purchaseDate: -1,
    });

    res.status(200).json(ingredients);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ message: 'Error fetching inventory' });
  }
};

// Add a single ingredient to inventory manually
const addIngredient = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const ingredientData = req.body;

    // Assign the current user ID
    ingredientData.userId = userId;

    // If it's a dry ingredient, we don't need an expiry date
    if (ingredientData.category === IngredientCategory.DRY) {
      ingredientData.expiryDate = null;
    } else if (!ingredientData.expiryDate) {
      // For non-dry ingredients, calculate a default expiry date based on category
      const purchaseDate = ingredientData.purchaseDate || new Date();
      let daysToExpiry = 0;

      switch (ingredientData.category) {
        case IngredientCategory.VEGETABLE:
          daysToExpiry = 7; // 1 week
          break;
        case IngredientCategory.FRUIT:
          daysToExpiry = 7; // 1 week
          break;
        case IngredientCategory.DAIRY:
          daysToExpiry = 14; // 2 weeks
          break;
        case IngredientCategory.MEAT:
          daysToExpiry = 5; // 5 days
          break;
        case IngredientCategory.FROZEN:
          daysToExpiry = 90; // 3 months
          break;
        case IngredientCategory.BAKERY:
          daysToExpiry = 5; // 5 days
          break;
        default:
          daysToExpiry = 14; // 2 weeks for other
      }

      const expiryDate = new Date(purchaseDate);
      expiryDate.setDate(expiryDate.getDate() + daysToExpiry);
      ingredientData.expiryDate = expiryDate;
    }

    // IMPROVED: Check if item is already expired or about to expire when adding
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    if (ingredientData.expiryDate) {
      const expiryDate = new Date(ingredientData.expiryDate);
      
      if (expiryDate < today) {
        // Item is already expired
        ingredientData.status = IngredientStatus.EXPIRED;
        ingredientData.aboutToExpire = false;
      } else if (expiryDate <= threeDaysFromNow) {
        // Item is about to expire
        ingredientData.aboutToExpire = true;
        ingredientData.status = IngredientStatus.AVAILABLE;
      } else {
        // Item is fresh
        ingredientData.aboutToExpire = false;
        ingredientData.status = IngredientStatus.AVAILABLE;
      }
    } else {
      // No expiry date (dry goods)
      ingredientData.status = IngredientStatus.AVAILABLE;
      ingredientData.aboutToExpire = false;
    }

    const newIngredient = new Ingredient(ingredientData);
    await newIngredient.save();

    res.status(201).json(newIngredient);
  } catch (error) {
    console.error('Error adding ingredient:', error);
    res.status(500).json({ message: 'Error adding ingredient' });
  }
};

// Update an existing ingredient
const updateIngredient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const updates = req.body;

    // Find the ingredient and verify ownership
    const ingredient = await Ingredient.findOne({ _id: id, userId });

    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }

    // Apply updates
    Object.keys(updates).forEach((key) => {
      if (key !== '_id' && key !== 'userId') {
        // @ts-ignore: Dynamic property assignment
        ingredient[key] = updates[key];
      }
    });

    // IMPROVED: Check expiry status when updating
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    if (ingredient.expiryDate) {
      const expiryDate = new Date(ingredient.expiryDate);
      
      if (expiryDate < today && ingredient.status === IngredientStatus.AVAILABLE) {
        // Item has expired
        ingredient.status = IngredientStatus.EXPIRED;
        ingredient.aboutToExpire = false;
      } else if (expiryDate <= threeDaysFromNow && ingredient.status === IngredientStatus.AVAILABLE) {
        // Item is about to expire
        ingredient.aboutToExpire = true;
      } else if (expiryDate > threeDaysFromNow && ingredient.status === IngredientStatus.AVAILABLE) {
        // Item is not expiring soon
        ingredient.aboutToExpire = false;
      }
    }

    await ingredient.save();
    res.status(200).json(ingredient);
  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ message: 'Error updating ingredient' });
  }
};

// Delete an ingredient
const deleteIngredient = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await Ingredient.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }

    res.status(200).json({ message: 'Ingredient deleted successfully' });
  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ message: 'Error deleting ingredient' });
  }
};

// Get inventory statistics
const getInventoryStats = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    // IMPROVED: First update expired items before calculating stats
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: userId missing' });
    }
    await updateExpiryStatuses(userId);

    // IMPROVED: First update expired items before calculating stats
    await updateExpiryStatuses(userId);

    // Count items by category
    const categoryCounts = await Ingredient.aggregate([
      { $match: { userId: userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // Set dates for expiring items
    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Count expiring items (within next 3 days, not expired yet)
    const expiringCount = await Ingredient.countDocuments({
      userId,
      status: IngredientStatus.AVAILABLE,
      expiryDate: { $ne: null, $lte: threeDaysFromNow, $gt: today },
    });

    // FIXED: Count expired items properly
    const expiredCount = await Ingredient.countDocuments({
      userId,
      status: IngredientStatus.EXPIRED,
    });

    // Total items (only available and expired, not consumed or wasted)
    const totalCount = await Ingredient.countDocuments({ 
      userId,
      status: { $in: [IngredientStatus.AVAILABLE, IngredientStatus.EXPIRED] }
    });

    res.status(200).json({
      totalItems: totalCount,
      categoryCounts,
      expiringItems: expiringCount,
      expiredItems: expiredCount,
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.status(500).json({ message: 'Error fetching inventory statistics' });
  }
};

export default {
  getUserInventory,
  addIngredient,
  updateIngredient,
  deleteIngredient,
  getInventoryStats,
};