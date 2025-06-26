// frontend/src/api/SurveyApi.tsx
import { useAuth0 } from '@auth0/auth0-react';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { toast } from 'sonner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type SurveyResponse = {
  _id: string;
  userId: string;
  rating: number;
  feedback?: string;
  surveyType: string;
  createdAt: string;
  updatedAt: string;
};

export type SurveyStatistics = {
  averageRating: number;
  totalResponses: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  satisfactionRate: number;
};

export type SurveySubmission = {
  rating: number;
  feedback?: string;
  surveyType?: string;
};

export type RecentFeedback = {
  _id: string;
  rating: number;
  feedback: string;
  createdAt: string;
};

// Get survey statistics (public)
export const useGetSurveyStatistics = (surveyType: string = 'app_satisfaction') => {
  const fetchSurveyStatistics = async (): Promise<SurveyStatistics> => {
    const response = await fetch(
      `${API_BASE_URL}/api/surveys/statistics?surveyType=${surveyType}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch survey statistics');
    }

    return response.json();
  };

  const {
    data: statistics,
    isLoading,
    error,
    refetch,
  } = useQuery(['surveyStatistics', surveyType], fetchSurveyStatistics);

  if (error) {
    console.error('Error fetching survey statistics:', error);
  }

  return { statistics, isLoading, refetch };
};

// Get user's survey response
export const useGetUserSurveyResponse = (surveyType: string = 'app_satisfaction') => {
  const { getAccessTokenSilently } = useAuth0();

  const fetchUserSurveyResponse = async () => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(
      `${API_BASE_URL}/api/surveys/my-response?surveyType=${surveyType}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user survey response');
    }

    return response.json();
  };

  const {
    data: userResponse,
    isLoading,
    error,
    refetch,
  } = useQuery(['userSurveyResponse', surveyType], fetchUserSurveyResponse);

  if (error) {
    console.error('Error fetching user survey response:', error);
  }

  return { userResponse, isLoading, refetch };
};

// Submit survey response
export const useSubmitSurveyResponse = () => {
  const { getAccessTokenSilently } = useAuth0();
  const queryClient = useQueryClient();

  const submitSurveyResponse = async (submission: SurveySubmission): Promise<any> => {
    const accessToken = await getAccessTokenSilently();

    const response = await fetch(`${API_BASE_URL}/api/surveys/submit`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submission),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to submit survey');
    }

    return response.json();
  };

  const mutation = useMutation(submitSurveyResponse, {
    onSuccess: () => {
      toast.success('Thank you for your feedback!');
      // Invalidate both user response and statistics queries
      queryClient.invalidateQueries('userSurveyResponse');
      queryClient.invalidateQueries('surveyStatistics');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to submit survey');
    },
  });

  return mutation;
};

// Get recent feedback (public)
export const useGetRecentFeedback = (limit: number = 5, surveyType: string = 'app_satisfaction') => {
  const fetchRecentFeedback = async (): Promise<RecentFeedback[]> => {
    const response = await fetch(
      `${API_BASE_URL}/api/surveys/feedback/recent?limit=${limit}&surveyType=${surveyType}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch recent feedback');
    }

    return response.json();
  };

  const {
    data: feedback,
    isLoading,
    error,
    refetch,
  } = useQuery(['recentFeedback', limit, surveyType], fetchRecentFeedback);

  if (error) {
    console.error('Error fetching recent feedback:', error);
  }

  return { feedback, isLoading, refetch };
};