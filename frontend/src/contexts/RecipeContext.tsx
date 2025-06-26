// frontend\src\contexts\RecipeContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { RecommendedRecipe } from '../api/RecipeApi';

interface RecipeContextType {
  recommendations: RecommendedRecipe[];
  setRecommendations: (recipes: RecommendedRecipe[]) => void;
  preferences: {
    mealType: string;
    prioritizeExpiring: boolean;
    selectedIngredients: string[];
  };
  setPreferences: (prefs: any) => void;
}

const RecipeContext = createContext<RecipeContextType | undefined>(undefined);

export const RecipeProvider = ({ children }: { children: ReactNode }) => {
  const [recommendations, setRecommendations] = useState<RecommendedRecipe[]>(
    []
  );
  const [preferences, setPreferences] = useState({
    mealType: 'any',
    prioritizeExpiring: true,
    selectedIngredients: [],
  });

  return (
    <RecipeContext.Provider
      value={{
        recommendations,
        setRecommendations,
        preferences,
        setPreferences,
      }}
    >
      {children}
    </RecipeContext.Provider>
  );
};

export const useRecipeContext = () => {
  const context = useContext(RecipeContext);
  if (!context) {
    throw new Error('useRecipeContext must be used within RecipeProvider');
  }
  return context;
};
