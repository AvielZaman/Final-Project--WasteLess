// backend/src/routes/InventoryRoute.ts
import express, { RequestHandler } from 'express';
import InventoryController from '../controllers/InventoryController';
import InventoryStatisticsController from '../controllers/InventoryStatisticsController';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();

// Apply JWT middleware to all routes
router.use(jwtCheck, jwtParse);

// Get all ingredients in inventory
router.get('/', InventoryController.getUserInventory as RequestHandler);

// Get inventory statistics
router.get('/stats', InventoryController.getInventoryStats as RequestHandler);

// Get detailed inventory statistics
router.get(
  '/statistics',
  InventoryStatisticsController.getInventoryStatistics as RequestHandler
);

// Get additional metrics
router.get(
  '/additional-metrics',
  InventoryStatisticsController.getAdditionalMetrics as RequestHandler
);

// Add a new ingredient manually
router.post('/', InventoryController.addIngredient as RequestHandler);

// Update an existing ingredient
router.put('/:id', InventoryController.updateIngredient as RequestHandler);

// Delete an ingredient
router.delete('/:id', InventoryController.deleteIngredient as RequestHandler);

export default router;