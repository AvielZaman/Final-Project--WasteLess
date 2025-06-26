// backend/src/controllers/MyUserController.ts
import { Request, Response } from 'express';
import User from '../models/user';
import Ingredient from '../models/ingredient';
import Purchase from '../models/purchase';
import { SurveyResponse, RecipeUsage } from '../models/survey';

export const createCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    console.log('⭐ Create user endpoint hit');
    console.log('📝 Request headers:', req.headers.authorization);
    console.log('📝 Request body:', req.body);

    const { auth0Id, email } = req.body;

    if (!auth0Id || !email) {
      console.error('❌ Missing data:', { auth0Id: !!auth0Id, email: !!email });
      res.status(400).json({
        message: 'Missing required fields',
        received: req.body,
      });
      return;
    }

    console.log('🔍 Looking for existing user with auth0Id:', auth0Id);
    const existingUser = await User.findOne({ auth0Id });

    if (existingUser) {
      console.log('✅ User already exists');
      res.status(200).json({
        _id: existingUser._id,
        auth0Id: existingUser.auth0Id,
        email: existingUser.email,
        name: existingUser.name,
      });
      return;
    }

    console.log('🆕 Creating new user...');
    const newUser = new User({ auth0Id, email });
    const savedUser = await newUser.save();
    console.log('✅ User saved with ID:', savedUser._id);

    res.status(201).json({
      _id: savedUser._id,
      auth0Id: savedUser.auth0Id,
      email: savedUser.email,
      name: savedUser.name,
    });
  } catch (error) {
    console.error('❌ Error in createCurrentUser:', error);
    res.status(500).json({
      message: 'Error creating user',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Get current user - This DOES use jwtParse
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const auth0Id = req.auth0Id; // This comes from jwtParse middleware

    if (!auth0Id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const currentUser = await User.findOne({ auth0Id });

    if (!currentUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Return only the essential user fields
    res.status(200).json({
      _id: currentUser._id,
      auth0Id: currentUser.auth0Id,
      email: currentUser.email,
      name: currentUser.name,
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Error getting user' });
  }
};

// Delete user account
export const deleteCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const auth0Id = req.auth0Id;
    const userId = req.userId;

    if (!auth0Id || !userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Delete all user-related data
    await Promise.all([
      Ingredient.deleteMany({ userId }),
      Purchase.deleteMany({ userId }),
      SurveyResponse.deleteMany({ userId }),
      RecipeUsage.deleteMany({ userId }),
    ]);

    // Delete the user
    const deletedUser = await User.findOneAndDelete({ auth0Id });

    if (!deletedUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({ 
      message: 'Account deleted successfully',
      deletedUser: {
        email: deletedUser.email,
        deletedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user account' });
  }
};