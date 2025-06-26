// backend\src\models\recipe.ts
import mongoose from 'mongoose';

export enum MealType {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  DESSERT = 'dessert',
  ANY = 'any',
}

const recipeSchema = new mongoose.Schema(
  {
    recipeId: { type: Number, required: true, unique: true },
    title: { type: String, required: true },
    image: { type: String },
    ingredients: [{ type: String }],
    instructions: [{ type: String }],
    mealType: {
      type: String,
      enum: Object.values(MealType),
      default: MealType.ANY,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsedDate: {
      type: Date,
    },
    usedByUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        usedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    collection: 'recipes',
    timestamps: true,
  }
);

// Add indices for better query performance
recipeSchema.index({ recipeId: 1 }, { unique: true });
recipeSchema.index({ mealType: 1 });

const Recipe = mongoose.model('Recipe', recipeSchema);
export default Recipe;
