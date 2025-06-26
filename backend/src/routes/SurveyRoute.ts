// backend/src/routes/SurveyRoute.ts
import express, { RequestHandler } from 'express';
import SurveyController from '../controllers/SurveyController';
import { jwtCheck, jwtParse } from '../middleware/auth';

const router = express.Router();

// Public route for getting survey statistics (no auth required)
router.get('/statistics', SurveyController.getSurveyStatistics as RequestHandler);

// Public route for getting recent feedback (no auth required)
router.get('/feedback/recent', SurveyController.getRecentFeedback as RequestHandler);

// Protected routes
router.use(jwtCheck, jwtParse);

// Submit survey response
router.post('/submit', SurveyController.submitSurveyResponse as RequestHandler);

// Get user's current survey response
router.get('/my-response', SurveyController.getUserSurveyResponse as RequestHandler);

export default router;