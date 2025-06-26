// frontend\src\main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./global.css"
import { BrowserRouter as Router } from 'react-router-dom'
import AppRoutes from './AppRoutes'
import Auth0ProviderWithNavigate from './auth/Auth0ProviderWithNavigate'
import { QueryClient, QueryClientProvider } from 'react-query';
import { RecipeProvider } from './contexts/RecipeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <Auth0ProviderWithNavigate>
          <RecipeProvider>
            <AppRoutes />
            {/* <Toaster visibleToasts={1} position="top-right" richColors /> */}
          </RecipeProvider>
        </Auth0ProviderWithNavigate>
      </QueryClientProvider>
    </Router>
  </StrictMode>
);
