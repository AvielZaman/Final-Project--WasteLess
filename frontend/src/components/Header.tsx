// frontend\src\components\Header.tsx
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { useGetInventoryStats } from '../api/InventoryApi';
import { CircleUserRound, Package, ShoppingBag, ChefHat } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Separator } from '../components/ui/separator';
import { Button } from '../components/ui/button';

const Header = () => {
  const { isAuthenticated, loginWithRedirect, logout, user } = useAuth0();
  const { stats } = useGetInventoryStats();

  // Only show badge if there are expiring items (within next 3 days)
  const expiringItemsCount = stats?.expiringItems || 0;

  const handleLogin = async () => {
    await loginWithRedirect({
      appState: {
        returnTo: '/',
      },
    });
  };

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  return (
    <header className="py-6 bg-white shadow">
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link
          to="/"
          className="text-3xl font-bold tracking-tight text-green-700"
        >
          WasteLess
        </Link>

        <nav className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/inventory"
                className="text-gray-600 hover:text-green-700 font-medium relative"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span>My Inventory</span>
                </div>
                {expiringItemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {expiringItemsCount}
                  </span>
                )}
              </Link>

              <Link
                to="/purchases"
                className="text-gray-600 hover:text-green-700 font-medium"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  <span>Purchases</span>
                </div>
              </Link>

              <Link
                to="/recipes/recommended"
                className="text-gray-600 hover:text-green-700 font-medium"
              >
                <div className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  <span>Recipes</span>
                </div>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center px-3 font-bold hover:text-green-700 gap-2">
                  <CircleUserRound className="h-6 w-6 text-gray-800" />
                  {user?.email}
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>
                    <Link
                      to="/user-profile"
                      className="font-bold hover:text-gray-800 flex items-center gap-2 w-full"
                    >
                      <CircleUserRound className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <Separator />
                  <DropdownMenuItem>
                    <Button
                      onClick={handleLogout}
                      className="flex flex-1 font-bold bg-gray-800 w-full"
                      variant="destructive"
                    >
                      Log Out
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              onClick={handleLogin}
              className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded font-medium"
            >
              Login
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;