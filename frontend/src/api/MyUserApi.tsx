// frontend/src/api/MyUserApi.tsx
import { User } from '@/types';
import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const useGetMyUser = () => {
  const { getAccessTokenSilently } = useAuth0();

  const getMyUserRequest = async (): Promise<User> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/my/user`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }

    return response.json();
  };

  const {
    data: currentUser,
    isLoading,
    error,
  } = useQuery('fetchCurrentUser', getMyUserRequest);

  if (error) {
    toast.error(error.toString());
  }

  return { currentUser, isLoading };
};

type CreateUserRequest = {
  auth0Id: string;
  email: string;
};

export const useCreateMyUser = () => {
  const { getAccessTokenSilently } = useAuth0();

  const createMyUserRequest = async (user: CreateUserRequest) => {
    console.log('Starting user creation request:', user);

    const accessToken = await getAccessTokenSilently();
    console.log('Got access token');

    const response = await fetch(`${API_BASE_URL}/api/my/user`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });

    console.log('Response status:', response.status);

    if (!response.ok && response.status !== 200) {
      // Accept both 200 and 201
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create user');
    }

    return response.json();
  };

  const {
    mutateAsync: createUser,
    isLoading,
    isError,
    isSuccess,
  } = useMutation(createMyUserRequest, {
    onSuccess: (data) => {
      console.log('User creation success:', data);
    },
    onError: (error: any) => {
      console.error('User creation error:', error);
    },
  });

  return { createUser, isLoading, isError, isSuccess };
};

export const useDeleteMyUser = () => {
  const { getAccessTokenSilently, logout } = useAuth0();
  const queryClient = useQueryClient();

  const deleteMyUserRequest = async () => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/my/user`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete account');
    }

    return response.json();
  };

  const {
    mutateAsync: deleteUser,
    isLoading,
    isError,
    isSuccess,
  } = useMutation(deleteMyUserRequest, {
    onSuccess: (data) => {
      toast.success('Account deleted successfully');
      queryClient.clear(); // Clear all cached data
      // Log out the user after account deletion
      logout({
        logoutParams: {
          returnTo: window.location.origin,
        },
      });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete account');
    },
  });

  return { deleteUser, isLoading, isError, isSuccess };
};