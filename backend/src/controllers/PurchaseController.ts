// backend\src\controllers\PurchaseController.ts
import { Request, Response } from 'express';
import Purchase from '../models/purchase';
import Ingredient, { IngredientCategory } from '../models/ingredient';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import ReceiptProcessingService from '../services/ReceiptProcessingService';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

// Initialize multer upload middleware
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed') as any);
    }
  },
}).single('receiptImage');

// Get all purchases for the current user
const getUserPurchases = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const purchases = await Purchase.find({ userId }).sort({ date: -1 });

    res.status(200).json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ message: 'Error fetching purchases' });
  }
};

// Get a specific purchase by ID
const getPurchaseById = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const purchase = await Purchase.findOne({ _id: id, userId });

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    res.status(200).json(purchase);
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ message: 'Error fetching purchase' });
  }
};

// Process receipt with text extraction and Claude API
const processReceipt = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { receiptText, store, date } = req.body;

    if (!receiptText) {
      return res.status(400).json({ message: 'Receipt text is required' });
    }

    // Extract food items directly from the text using Claude
    const extractedItems =
      await ReceiptProcessingService.extractFoodItemsFromText(receiptText);

    // Create a new purchase with the extracted items
    const newPurchase = new Purchase({
      userId,
      date: date || new Date(),
      store,
      items: extractedItems,
      // Calculate total if prices are available
      totalAmount: extractedItems.reduce((total: number, item) => {
        return total + (item.price || 0);
      }, 0),
    });

    await newPurchase.save();

    res.status(201).json(newPurchase);
  } catch (error) {
    console.error('Error processing receipt:', error);
    res.status(500).json({
      message: 'Error processing receipt',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Process receipt image
const processReceiptImage = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { store, date, isHebrew } = req.body;

    // The file should be available in req.file after multer processing
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Process the receipt based on language
    let extractedItems;
    if (isHebrew === 'true') {
      console.log('Processing Hebrew receipt...');
      extractedItems = await ReceiptProcessingService.processHebrewReceipt(
        filePath
      );
    } else {
      console.log('Processing regular receipt...');
      extractedItems = await ReceiptProcessingService.processReceipt(filePath);
    }

    // Clean up the file
    fs.unlinkSync(filePath);

    // Filter out non-food items and ensure valid quantities
    const nonFoodTerms = [
      'shoes',
      'shoe',
      'clothing',
      'electronics',
      'hardware',
      'toy',
    ];

    const filteredItems = extractedItems
      .filter((item) => {
        // Skip items with names matching non-food terms
        const itemNameLower = item.name.toLowerCase();
        return !nonFoodTerms.some((term) => itemNameLower.includes(term));
      })
      .map((item) => {
        // Ensure all items have valid quantity and unit
        return {
          ...item,
          quantity: item.quantity || 1, // Default to 1 if quantity is null
          unit: item.unit || 'unit', // Default to 'unit' if unit is null
        };
      });

    // If no valid food items remain after filtering
    if (filteredItems.length === 0) {
      return res.status(400).json({
        message: 'No valid food items found in receipt',
      });
    }

    // Create a new purchase with the extracted items
    const newPurchase = new Purchase({
      userId,
      date: date || new Date(),
      store,
      items: filteredItems,
      // Calculate total if prices are available
      totalAmount: filteredItems.reduce((total, item) => {
        return total + (item.price || 0);
      }, 0),
    });

    await newPurchase.save();

    res.status(201).json(newPurchase);
  } catch (error) {
    console.error('Error processing receipt image:', error);
    res.status(500).json({
      message: 'Error processing receipt image',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// Update purchase items (e.g., to add expiration dates)
const updatePurchaseItems = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { items } = req.body;

    const purchase = await Purchase.findOne({ _id: id, userId });

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Update the items
    purchase.items = items;
    await purchase.save();

    res.status(200).json(purchase);
  } catch (error) {
    console.error('Error updating purchase items:', error);
    res.status(500).json({ message: 'Error updating purchase items' });
  }
};

// Add purchase items to inventory
const addPurchaseToInventory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { items } = req.body; // Optional: allow client to send modified items

    const purchase = await Purchase.findOne({ _id: id, userId });

    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Use the passed items or the ones in the purchase
    const itemsToAdd = items || purchase.items;

    // Add items to inventory
    const addedIngredients = [];
    const updatedIngredients = [];

    for (const item of itemsToAdd) {
      // Skip items already added to inventory
      if (item.addedToInventory) continue;

      // Check if this item already exists in inventory (same name and category)
      const existingIngredient = await Ingredient.findOne({
        userId,
        name: item.name,
        category: item.category,
        // For dry goods (which don't expire), we can combine them
        ...(item.category === 'dry' ? {} : { expiryDate: { $exists: true } }),
      });

      if (existingIngredient && item.category === 'dry') {
        // Update the quantity of the existing ingredient
        existingIngredient.quantity += item.quantity || 1;
        await existingIngredient.save();
        updatedIngredients.push(existingIngredient);
      } else {
        // Create a new ingredient
        const ingredientData = {
          userId,
          name: item.name,
          category: item.category,
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          purchaseDate: purchase.date,
          expiryDate: item.expiryDate,
          additionalInfo: item.additionalInfo,
        };

        // If expiry date is not set, set a default based on category (except for dry items)
        if (!item.expiryDate && item.category !== 'dry') {
          let daysToExpiry = 0;

          switch (item.category) {
            case 'vegetable':
              daysToExpiry = 7; // 1 week
              break;
            case 'fruit':
              daysToExpiry = 7; // 1 week
              break;
            case 'dairy':
              daysToExpiry = 5; // 2 weeks
              break;
            case 'meat':
              daysToExpiry = 5; // 5 days
              break;
            case 'frozen':
              daysToExpiry = 90; // 3 months
              break;
            case 'bakery':
              daysToExpiry = 5; // 5 days
              break;
            default:
              daysToExpiry = 14; // 2 weeks for other
          }

          const expiryDate = new Date(purchase.date);
          expiryDate.setDate(expiryDate.getDate() + daysToExpiry);
          ingredientData.expiryDate = expiryDate;
        }

        const newIngredient = new Ingredient(ingredientData);
        await newIngredient.save();
        addedIngredients.push(newIngredient);
      }

      // Mark the item as added to inventory
      item.addedToInventory = true;
    }

    // Save the updated purchase to mark items as added
    await purchase.save();

    res.status(200).json({
      message: `Added ${addedIngredients.length} new ingredients${
        updatedIngredients.length > 0
          ? ` and updated ${updatedIngredients.length} existing ingredients`
          : ''
      }`,
      ingredients: [...addedIngredients, ...updatedIngredients],
      purchase,
    });
  } catch (error) {
    console.error('Error adding to inventory:', error);
    res.status(500).json({ message: 'Error adding to inventory' });
  }
};

// Delete a purchase
const deletePurchase = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const result = await Purchase.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    res.status(200).json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({ message: 'Error deleting purchase' });
  }
};

export default {
  getUserPurchases,
  getPurchaseById,
  processReceipt,
  updatePurchaseItems,
  addPurchaseToInventory,
  deletePurchase,
  processReceiptImage,
};
