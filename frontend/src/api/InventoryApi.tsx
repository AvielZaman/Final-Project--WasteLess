// frontend\src\api\InventoryApi.tsx
import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type Ingredient = {
  _id?: string;
  name: string;
  category:
    | 'dry'
    | 'vegetable'
    | 'fruit'
    | 'dairy'
    | 'meat'
    | 'frozen'
    | 'bakery'
    | 'other';
  quantity: number;
  unit: string;
  expiryDate?: Date | null;
  purchaseDate: Date;
  additionalInfo?: string;
  aboutToExpire?: boolean;
  status?: 'available' | 'consumed' | 'expired' | 'wasted'; // Add status field
};

export type InventoryStats = {
  totalItems: number;
  categoryCounts: { _id: string; count: number }[];
  expiringItems: number;
  expiredItems: number;
};

// Get all ingredients for the current user's inventory
export const useGetInventory = (category?: string) => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchInventory = async (): Promise<Ingredient[]> => {
    const accessToken = await getAccessTokenSilently();

    const url = category
      ? `${API_BASE_URL}/api/inventory?category=${category}`
      : `${API_BASE_URL}/api/inventory`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch inventory');
    }

    return response.json();
  };

  const {
    data: ingredients,
    isLoading,
    error,
    refetch,
  } = useQuery(['inventory', category], fetchInventory);

  if (error) {
    toast.error('Error fetching inventory');
  }

  return { ingredients, isLoading, refetch };
};

export const useGetInventoryStats = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  const fetchStats = async (): Promise<InventoryStats> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/inventory/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch inventory statistics');
    }

    return response.json();
  };

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery('inventoryStats', fetchStats, {
    enabled: isAuthenticated, // Only run query if authenticated
  });

  if (error) {
    toast.error('Error fetching inventory statistics');
  }

  return { stats, isLoading };
};

// Add a new ingredient manually
export const useAddIngredient = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const addIngredient = async (ingredient: Ingredient): Promise<Ingredient> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/inventory`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ingredient),
    });

    if (!response.ok) {
      throw new Error('Failed to add ingredient');
    }

    return response.json();
  };

  const mutation = useMutation(addIngredient, {
    onSuccess: () => {
      toast.success('Ingredient added successfully');
      queryClient.invalidateQueries('inventory');
      queryClient.invalidateQueries('inventoryStats');
    },
    onError: () => {
      toast.error('Failed to add ingredient');
    },
  });

  return mutation;
};

// Update an ingredient
export const useUpdateIngredient = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const updateIngredient = async (
    ingredient: Ingredient
  ): Promise<Ingredient> => {
    if (!ingredient._id) {
      throw new Error('Ingredient ID is required for update');
    }

    const accessToken = await getAccessTokenSilently();

    const response = await fetch(
      `${API_BASE_URL}/api/inventory/${ingredient._id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ingredient),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update ingredient');
    }

    return response.json();
  };

  const mutation = useMutation(updateIngredient, {
    onSuccess: () => {
      toast.success('Ingredient updated successfully');
      queryClient.invalidateQueries('inventory');
      queryClient.invalidateQueries('inventoryStats');
    },
    onError: () => {
      toast.error('Failed to update ingredient');
    },
  });

  return mutation;
};

// Delete an ingredient
export const useDeleteIngredient = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const deleteIngredient = async (id: string): Promise<void> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/inventory/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete ingredient');
    }
  };

  const mutation = useMutation(deleteIngredient, {
    onSuccess: () => {
      toast.success('Ingredient deleted successfully');
      queryClient.invalidateQueries('inventory');
      queryClient.invalidateQueries('inventoryStats');
    },
    onError: () => {
      toast.error('Failed to delete ingredient');
    },
  });

  return mutation;
};
