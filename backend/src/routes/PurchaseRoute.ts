// backend\src\routes\PurchaseRoute.ts
import express, { RequestHandler, Request, Response } from 'express';
import PurchaseController, { upload } from '../controllers/PurchaseController';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();

// Apply JWT middleware to all routes
router.use(jwtCheck, jwtParse);

// Get all purchases for current user
router.get('/', PurchaseController.getUserPurchases as RequestHandler);

// Get a specific purchase by ID
router.get('/:id', PurchaseController.getPurchaseById as RequestHandler);

// Process receipt text to create a new purchase
router.post(
  '/process-receipt',
  PurchaseController.processReceipt as RequestHandler
);

// Process receipt image to create a new purchase (handles both English and Hebrew)
router.post(
  '/process-receipt-image',
  (req: Request, res: Response, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message });
      }
      next();
    });
  },
  PurchaseController.processReceiptImage as RequestHandler
);

// Update purchase items (e.g., to add expiration dates)
router.put(
  '/:id/items',
  PurchaseController.updatePurchaseItems as RequestHandler
);

// Add purchase items to inventory
router.post(
  '/:id/add-to-inventory',
  PurchaseController.addPurchaseToInventory as RequestHandler
);

// Delete a purchase
router.delete('/:id', PurchaseController.deletePurchase as RequestHandler);

export default router;
