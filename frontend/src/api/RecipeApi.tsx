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

// FIXED: Get recommended recipes with better error handling
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

    console.log('FIXED: Calling recommendation API with URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch recommended recipes');
    }

    const data = await response.json();
    console.log('FIXED: Received recommendations:', data);
    return data;
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
    fetchRecommendedRecipes,
    {
      // Add some retry logic for failed requests
      retry: (failureCount, error) => {
        // Don't retry if it's a 401 (unauthorized) or 400 (bad request)
        if (error instanceof Error && error.message.includes('401')) return false;
        if (error instanceof Error && error.message.includes('400')) return false;
        return failureCount < 2;
      },
      // Cache results for 5 minutes
      staleTime: 5 * 60 * 1000,
    }
  );

  if (error) {
    console.error('Error fetching recommended recipes:', error);
    toast.error('Error fetching recommended recipes');
  }

  return { recommendedRecipes: recommendedRecipes || [], isLoading, refetch };
};

// FIXED: Accept a recipe with enhanced error handling and better query invalidation
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

    console.log('FIXED: Sending accept recipe request:', {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to accept recipe');
    }

    return response.json();
  };

  const mutation = useMutation(acceptRecipe, {
    onSuccess: (data) => {
      toast.success(data.message);
      
      // FIXED: Comprehensive query invalidation to ensure UI updates
      console.log('FIXED: Invalidating queries after recipe acceptance...');
      
      // Inventory related queries - invalidate ALL variants
      queryClient.invalidateQueries(['inventory']);
      queryClient.invalidateQueries(['inventoryStats']);
      queryClient.invalidateQueries(['inventoryStatistics']);
      
      // Recommendation queries - force refresh
      queryClient.invalidateQueries(['recommendedRecipes']);
      
      // Profile and statistics queries
      queryClient.invalidateQueries(['fetchCurrentUser']);
      queryClient.invalidateQueries(['additionalMetrics']);
      
      // FIXED: Also invalidate any time-based statistics queries
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'inventoryStatistics' || 
                 queryKey[0] === 'additionalMetrics' ||
                 queryKey[0] === 'inventory' ||
                 queryKey[0] === 'inventoryStats' ||
                 queryKey[0] === 'recommendedRecipes';
        }
      });
      
      // FIXED: Force immediate refetch of critical data
      queryClient.refetchQueries(['inventory'], { active: true });
      queryClient.refetchQueries(['inventoryStats'], { active: true });
      
      console.log('FIXED: Successfully invalidated all relevant queries');
    },
    onError: (error: Error) => {
      console.error('FIXED: Error accepting recipe:', error);
      toast.error(error.message || 'Failed to accept recipe');
    },
  });

  return mutation;
};