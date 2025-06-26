// frontend/src/api/RecipeApi.tsx - FIXED VERSION
import { useAuth0 } from '@auth0/auth0-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type Recipe = {
  _id: string;
  recipeId: number;
  title: string;
  image?: string;
  ingredients: string[];
  instructions: string[];
  mealType: string;
};

export type RecommendedRecipe = {
  id: string;
  title: string;
  image?: string;
  score: number;
  mealType: string;
  usedIngredients: string[];
  missedIngredients: string[];
  instructions: string[];
  matchCount?: number;
  totalIngredients?: number;
  expiringIngredients?: number;
};

// Get all recipes (with pagination and filtering)
export const useGetRecipes = (
  mealType: string = 'any',
  page: number = 1,
  limit: number = 20,
  search?: string
) => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchRecipes = async () => {
    const accessToken = await getAccessTokenSilently();

    let url = `${API_BASE_URL}/api/recipes?page=${page}&limit=${limit}&mealType=${mealType}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipes');
    }

    return response.json();
  };

  const { data, isLoading, error, refetch } = useQuery(
    ['recipes', mealType, page, limit, search],
    fetchRecipes
  );

  if (error) {
    toast.error('Error fetching recipes');
  }

  return {
    recipes: data?.recipes || [],
    currentPage: data?.currentPage || 1,
    totalPages: data?.totalPages || 1,
    totalRecipes: data?.totalRecipes || 0,
    isLoading,
    refetch,
  };
};

// Get recipe by ID
export const useGetRecipeById = (id: string | undefined) => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchRecipe = async (): Promise<Recipe | null> => {
    if (!id) return null;

    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/recipes/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recipe');
    }

    return response.json();
  };

  const {
    data: recipe,
    isLoading,
    error,
    refetch,
  } = useQuery(['recipe', id], fetchRecipe, {
    enabled: !!id,
  });

  if (error) {
    toast.error('Error fetching recipe details');
  }

  return { recipe, isLoading, refetch };
};

// Get recommended recipes
export const useGetRecommendedRecipes = (
  mealType: string = 'any',
  prioritizeExpiring: boolean = true,
  selectedIngredients: string[] = [],
  count: number = 5
) => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchRecommendedRecipes = async (): Promise<RecommendedRecipe[]> => {
    const accessToken = await getAccessTokenSilently();

    // Build URL with query parameters
    let url = `${API_BASE_URL}/api/recipes/recommended/for-me?mealType=${mealType}&prioritizeExpiring=${prioritizeExpiring}`;

    if (selectedIngredients.length > 0) {
      url += `&includeIngredients=${encodeURIComponent(
        selectedIngredients.join(',')
      )}`;
    }

    if (count !== 5) {
      url += `&count=${count}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch recommended recipes');
    }

    return response.json();
  };

  const {
    data: recommendedRecipes,
    isLoading,
    error,
    refetch,
  } = useQuery(
    [
      'recommendedRecipes',
      mealType,
      prioritizeExpiring,
      selectedIngredients.join(','),
      count,
    ],
    fetchRecommendedRecipes
  );

  if (error) {
    toast.error('Error fetching recommended recipes');
  }

  return { recommendedRecipes, isLoading, refetch };
};

// Accept a recipe (mark as made and update inventory)
export const useAcceptRecipe = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const acceptRecipe = async ({
    recipeId,
    usedIngredients,
    wasRecommended = false,
  }: {
    recipeId: string;
    usedIngredients: string[];
    wasRecommended?: boolean;
  }) => {
    const accessToken = await getAccessTokenSilently();

    console.log('Sending accept recipe request:', {
      recipeId,
      usedIngredients,
      wasRecommended,
    });

    const response = await fetch(
      `${API_BASE_URL}/api/recipes/${recipeId}/accept`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usedIngredients, wasRecommended }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to accept recipe');
    }

    return response.json();
  };

  const mutation = useMutation(acceptRecipe, {
    onSuccess: (data) => {
      toast.success(data.message);
      
      // FIXED: Invalidate ALL inventory and statistics related queries
      // Inventory queries
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryStats']);
      
      // Statistics queries - invalidate all time ranges
      queryClient.invalidateQueries(['inventoryStatistics']);
      queryClient.invalidateQueries(['additionalMetrics']);
      
      // Profile page queries
      queryClient.invalidateQueries(['fetchCurrentUser']);
      
      // Force refetch of commonly used queries
      queryClient.refetchQueries(['inventory']);
      queryClient.refetchQueries(['inventoryStats']);
      
      // Invalidate all statistics queries regardless of timeRange parameter
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'inventoryStatistics' || 
                 queryKey[0] === 'additionalMetrics';
        }
      });
      
      console.log('Successfully invalidated all statistics queries');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to accept recipe');
    },
  });

  return mutation;
};