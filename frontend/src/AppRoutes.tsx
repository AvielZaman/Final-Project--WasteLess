// frontend/src/AppRoutes.tsx
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './layouts/layout';
import HomePage from './pages/HomePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import InventoryPage from './pages/InventoryPage';
import PurchasesPage from './pages/PurchasesPage';
import PurchaseDetailPage from './pages/PurchaseDetailPage';
import InventoryStatisticsPage from './pages/InventoryStatisticsPage';
import UserProfilePage from './pages/UserProfilePage';
import ProtectedRoute from './auth/ProtectedRoute';
import RecommendedRecipesPage from './pages/RecommendedRecipesPage';
import RecipeDetailPage from './pages/RecipeDetailPage';

const AppRoutes = () => {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <HomePage />
          </Layout>
        }
      />
      <Route path="/auth-callback" element={<AuthCallbackPage />} />

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/inventory"
          element={
            <Layout>
              <InventoryPage />
            </Layout>
          }
        />
        <Route
          path="/inventory/statistics"
          element={
            <Layout>
              <InventoryStatisticsPage />
            </Layout>
          }
        />
        <Route
          path="/purchases"
          element={
            <Layout>
              <PurchasesPage />
            </Layout>
          }
        />
        <Route
          path="/purchases/:id"
          element={
            <Layout>
              <PurchaseDetailPage />
            </Layout>
          }
        />
        <Route
          path="/user-profile"
          element={
            <Layout>
              <UserProfilePage />
            </Layout>
          }
        />
      </Route>

      <Route
        path="/recipes/recommended"
        element={
          <Layout>
            <RecommendedRecipesPage />
          </Layout>
        }
      />
      <Route
        path="/recipes/:id"
        element={
          <Layout>
            <RecipeDetailPage />
          </Layout>
        }
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default AppRoutes;