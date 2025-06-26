// frontend\src\api\PurchaseApi.tsx
import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'sonner';
import { Ingredient } from './InventoryApi';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type PurchaseItem = {
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
  price?: number;
  expiryDate?: Date | null;
  addedToInventory: boolean;
  additionalInfo?: string;
};

export type Purchase = {
  _id?: string;
  date: Date;
  store?: string;
  totalAmount?: number;
  receiptImage?: string;
  items: PurchaseItem[];
  additionalInfo?: string;
};

// Get all purchases for the current user
export const useGetPurchases = () => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchPurchases = async (): Promise<Purchase[]> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/purchases`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch purchases');
    }

    return response.json();
  };

  const {
    data: purchases,
    isLoading,
    error,
    refetch,
  } = useQuery('purchases', fetchPurchases);

  if (error) {
    toast.error('Error fetching purchases');
  }

  return { purchases, isLoading, refetch };
};

// Get a specific purchase by ID
export const useGetPurchaseById = (id: string | undefined) => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchPurchase = async (): Promise<Purchase | null> => {
    if (!id) return null;

    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/purchases/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch purchase');
    }

    return response.json();
  };

  const {
    data: purchase,
    isLoading,
    error,
    refetch,
  } = useQuery(['purchase', id], fetchPurchase, {
    enabled: !!id,
  });

  if (error) {
    toast.error('Error fetching purchase details');
  }

  return { purchase, isLoading, refetch };
};

// Process receipt to create a new purchase
export const useProcessReceipt = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const processReceipt = async (data: {
    receiptText: string;
    store?: string;
    date?: Date;
  }): Promise<Purchase> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(
      `${API_BASE_URL}/api/purchases/process-receipt`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to process receipt');
    }

    return response.json();
  };

  const mutation = useMutation(processReceipt, {
    onSuccess: (data) => {
      toast.success(
        `Receipt processed successfully - ${data.items.length} items found`
      );
      queryClient.invalidateQueries('purchases');
    },
    onError: (error: Error) => {
      toast.error(`Failed to process receipt: ${error.message}`);
    },
  });

  return mutation;
};

// Update purchase items (e.g., to add expiration dates)
export const useUpdatePurchaseItems = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const updatePurchaseItems = async ({
    id,
    items,
  }: {
    id: string;
    items: PurchaseItem[];
  }): Promise<Purchase> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/purchases/${id}/items`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      throw new Error('Failed to update purchase items');
    }

    return response.json();
  };

  const mutation = useMutation(updatePurchaseItems, {
    onSuccess: () => {
      toast.success('Purchase items updated successfully');
      queryClient.invalidateQueries('purchases');
      queryClient.invalidateQueries(['purchase']);
    },
    onError: () => {
      toast.error('Failed to update purchase items');
    },
  });

  return mutation;
};

// Add purchase items to inventory
export const useAddPurchaseToInventory = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const addToInventory = async ({
    id,
    items,
  }: {
    id: string;
    items?: PurchaseItem[];
  }): Promise<{
    message: string;
    ingredients: Ingredient[];
    purchase: Purchase;
  }> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(
      `${API_BASE_URL}/api/purchases/${id}/add-to-inventory`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items ? { items } : {}),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to add purchase to inventory');
    }

    return response.json();
  };

  const mutation = useMutation(addToInventory, {
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries('purchases');
      queryClient.invalidateQueries(['purchase']);
      queryClient.invalidateQueries('inventory');
      queryClient.invalidateQueries('inventoryStats');
    },
    onError: () => {
      toast.error('Failed to add purchase to inventory');
    },
  });

  return mutation;
};

// Delete a purchase
export const useDeletePurchase = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const deletePurchase = async (id: string): Promise<void> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/purchases/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete purchase');
    }
  };

  const mutation = useMutation(deletePurchase, {
    onSuccess: () => {
      toast.success('Purchase deleted successfully');
      queryClient.invalidateQueries('purchases');
    },
    onError: () => {
      toast.error('Failed to delete purchase');
    },
  });

  return mutation;
};
