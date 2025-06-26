// backend/src/controllers/SurveyController.ts
import { Request, Response } from 'express';
import { SurveyResponse } from '../models/survey';

// Submit a survey response
const submitSurveyResponse = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { rating, feedback, surveyType = 'app_satisfaction' } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5' 
      });
    }

    // Use upsert to replace existing response for this user and survey type
    const surveyResponse = await SurveyResponse.findOneAndUpdate(
      { userId, surveyType },
      {
        userId,
        rating,
        feedback: feedback || '',
        surveyType,
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      message: 'Survey response saved successfully',
      response: surveyResponse,
    });
  } catch (error) {
    console.error('Error submitting survey response:', error);
    res.status(500).json({ message: 'Error submitting survey response' });
  }
};

// Get survey statistics (public - for all users to see)
const getSurveyStatistics = async (req: Request, res: Response) => {
  try {
    const { surveyType = 'app_satisfaction' } = req.query;

    // Get aggregated statistics
    const stats = await SurveyResponse.aggregate([
      {
        $match: { surveyType },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalResponses: { $sum: 1 },
          ratingDistribution: {
            $push: '$rating',
          },
        },
      },
      {
        $project: {
          _id: 0,
          averageRating: { $round: ['$averageRating', 2] },
          totalResponses: 1,
          ratingDistribution: 1,
        },
      },
    ]);

    // Calculate rating distribution
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    if (stats.length > 0 && stats[0].ratingDistribution) {
      stats[0].ratingDistribution.forEach((rating: number) => {
        ratingCounts[rating as keyof typeof ratingCounts]++;
      });
    }

    const result = {
      averageRating: stats[0]?.averageRating || 0,
      totalResponses: stats[0]?.totalResponses || 0,
      ratingDistribution: ratingCounts,
      // Calculate percentage of satisfied users (4+ rating)
      satisfactionRate: stats[0]?.totalResponses > 0 
        ? Math.round(((ratingCounts[4] + ratingCounts[5]) / stats[0].totalResponses) * 100)
        : 0,
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching survey statistics:', error);
    res.status(500).json({ message: 'Error fetching survey statistics' });
  }
};

// Get user's current survey response
const getUserSurveyResponse = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { surveyType = 'app_satisfaction' } = req.query;

    const response = await SurveyResponse.findOne({ userId, surveyType });

    res.status(200).json({
      hasResponded: !!response,
      response: response || null,
    });
  } catch (error) {
    console.error('Error fetching user survey response:', error);
    res.status(500).json({ message: 'Error fetching user survey response' });
  }
};

// Get recent feedback (for admins or general display)
const getRecentFeedback = async (req: Request, res: Response) => {
  try {
    const { limit = 10, surveyType = 'app_satisfaction' } = req.query;

    const feedback = await SurveyResponse.find({
      surveyType,
      feedback: { $exists: true, $ne: '' },
    })
      .select('rating feedback createdAt')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error fetching recent feedback:', error);
    res.status(500).json({ message: 'Error fetching recent feedback' });
  }
};

export default {
  submitSurveyResponse,
  getSurveyStatistics,
  getUserSurveyResponse,
  getRecentFeedback,
};