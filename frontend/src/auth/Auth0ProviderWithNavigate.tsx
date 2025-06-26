// frontend\src\auth\Auth0ProviderWithNavigate.tsx
import { Auth0Provider } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

type Props = {
  children: React.ReactNode;
};

const Auth0ProviderWithNavigate = ({ children }: Props) => {
  const navigate = useNavigate();

  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = import.meta.env.VITE_AUTH0_CALLBACK_URL;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  console.log('Auth0Provider configuration:', {
    domain,
    redirectUri, // This should show: http://localhost:5173/auth-callback
    audience,
  });

  if (!domain || !clientId || !redirectUri || !audience) {
    throw new Error('Unable to initialize auth');
  }

  const onRedirectCallback = (appState: any) => {
  console.log('🔍 Auth0 redirect callback triggered');
  console.log('🔍 appState:', appState);
  console.log('🔍 appState.returnTo:', appState?.returnTo); // ← Add this line
  
  // Force navigation to auth-callback for now
  const targetPath = '/auth-callback'; // ← Change this temporarily
  console.log('🔍 Navigating to:', targetPath);

  navigate(targetPath);
};

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri, // Must be http://localhost:5173/auth-callback
        audience,
      }}
      onRedirectCallback={onRedirectCallback}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
};

export default Auth0ProviderWithNavigate;
