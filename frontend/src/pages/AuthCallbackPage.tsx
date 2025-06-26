//frontend\src\pages\AuthCallbackPage.tsx
import { useCreateMyUser } from '../api/MyUserApi';
import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';


const AuthCallbackPage = () => {

  console.log('🎯 AuthCallbackPage component mounted!');
  const navigate = useNavigate();
  const { user, isLoading: auth0Loading, isAuthenticated } = useAuth0();
  const { createUser, isLoading, isError, isSuccess } = useCreateMyUser();
  const hasAttemptedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleUserCreation = async () => {
      // Wait for Auth0 to load
      if (auth0Loading) {
        console.log('Waiting for Auth0...');
        return;
      }

      // Check if authenticated
      if (!isAuthenticated) {
        console.log('Not authenticated');
        return;
      }

      // Check if we have user data
      if (!user?.sub || !user?.email) {
        console.log('Missing user data:', {
          sub: !!user?.sub,
          email: !!user?.email,
        });
        return;
      }

      // Prevent multiple attempts
      if (hasAttemptedRef.current) {
        console.log('Already attempted');
        return;
      }

      hasAttemptedRef.current = true;

      try {
        console.log('Creating user with:', {
          auth0Id: user.sub,
          email: user.email,
        });

        await createUser({
          auth0Id: user.sub,
          email: user.email,
        });

        
        navigate('/');
      } catch (error) {
        console.error('Failed to create user:', error);
        setError('Failed to complete registration. Please try again.');
        hasAttemptedRef.current = false; // Allow retry
      }
    };

    handleUserCreation();
  }, [auth0Loading, isAuthenticated, user, createUser, navigate]);

  // Navigate on success
  useEffect(() => {
    if (isSuccess) {
      navigate('/');
    }
  }, [isSuccess, navigate]);

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2 text-red-600">Error</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p className="text-lg font-semibold mb-2">Setting up your account...</p>
        <p className="text-sm text-gray-600">
          {auth0Loading
            ? 'Authenticating...'
            : isLoading
            ? 'Creating your account...'
            : 'Finalizing...'}
        </p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
