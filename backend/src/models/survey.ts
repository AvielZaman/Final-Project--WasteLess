// backend/src/models/survey.ts
import mongoose from 'mongoose';

const surveyResponseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    feedback: {
      type: String,
      maxlength: 1000,
    },
    surveyType: {
      type: String,
      enum: ['app_satisfaction', 'feature_feedback', 'general'],
      default: 'app_satisfaction',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one response per user per survey type
surveyResponseSchema.index({ userId: 1, surveyType: 1 }, { unique: true });

const SurveyResponse = mongoose.model('SurveyResponse', surveyResponseSchema);

// Model for tracking recipe usage
const recipeUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Recipe',
      required: true,
    },
    wasRecommended: {
      type: Boolean,
      default: false,
    },
    ingredientsUsed: [String],
    usedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const RecipeUsage = mongoose.model('RecipeUsage', recipeUsageSchema);

export { SurveyResponse, RecipeUsage };