// frontend\src\pages\InventoryPage.tsx
import { useState, useMemo } from 'react';
import {
  useGetInventory,
  useDeleteIngredient,
  useGetInventoryStats,
  Ingredient,
} from '../api/InventoryApi';
import { format } from 'date-fns';
import AddIngredientModal from '../components/AddIngredientModal';
import EditIngredientModal from '../components/EditIngredientModal';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Card, CardContent } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import {
  ArrowUpDown,
  Clock,
  FilterX,
  Plus,
  ShoppingBag,
  BarChart3,
} from 'lucide-react';

type SortOption =
  | 'expiry-asc'
  | 'expiry-desc'
  | 'purchase-asc'
  | 'purchase-desc'
  | 'none';

const InventoryPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    undefined
  );
  const [sortOption, setSortOption] = useState<SortOption>('expiry-asc');
  const { ingredients, isLoading, refetch } = useGetInventory(selectedCategory);
  const deleteIngredient = useDeleteIngredient();
  const navigate = useNavigate();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);

  const handleEditClick = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setShowEditModal(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ingredient?')) {
      await deleteIngredient.mutateAsync(id);
      toast.success('Ingredient deleted successfully');
      refetch();
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'dry':
        return 'bg-amber-100 text-amber-800';
      case 'vegetable':
        return 'bg-green-100 text-green-800';
      case 'fruit':
        return 'bg-orange-100 text-orange-800';
      case 'dairy':
        return 'bg-blue-100 text-blue-800';
      case 'meat':
        return 'bg-red-100 text-red-800';
      case 'frozen':
        return 'bg-cyan-100 text-cyan-800';
      case 'bakery':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpiringSoon = (expiryDate: Date) => {
    if (!expiryDate) return false;

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays <= 3 && diffDays >= 0; // 3 days or less to expiry
  };

  const isExpired = (expiryDate: Date) => {
    if (!expiryDate) return false;

    const today = new Date();
    const expiry = new Date(expiryDate);

    return expiry < today;
  };

  const formatDate = (date: string | Date) => {
    if (!date) return 'No expiry';
    return format(new Date(date), 'MMM dd, yyyy');
  };

  // Sort ingredients based on the selected option
  const sortedIngredients = useMemo(() => {
    if (!ingredients) return [];

    const ingredientsCopy = [...ingredients];

    switch (sortOption) {
      case 'expiry-asc':
        return ingredientsCopy.sort((a, b) => {
          // Put items with no expiry at the end
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;

          return (
            new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
          );
        });
      case 'expiry-desc':
        return ingredientsCopy.sort((a, b) => {
          if (!a.expiryDate && !b.expiryDate) return 0;
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;

          return (
            new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime()
          );
        });
      case 'purchase-asc':
        return ingredientsCopy.sort(
          (a, b) =>
            new Date(a.purchaseDate).getTime() -
            new Date(b.purchaseDate).getTime()
        );
      case 'purchase-desc':
        return ingredientsCopy.sort(
          (a, b) =>
            new Date(b.purchaseDate).getTime() -
            new Date(a.purchaseDate).getTime()
        );
      default:
        return ingredientsCopy;
    }
  }, [ingredients, sortOption]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Ingredients Inventory</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddModal(true)}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Ingredient
          </Button>
          <Button onClick={() => navigate('/purchases')} variant="outline">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Manage Purchases
          </Button>
          {/* Statistics Button */}
          <Button
            onClick={() => navigate('/inventory/statistics')}
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-50"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Inventory Statistics
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        {/* Category filter */}
        <div className="flex flex-wrap gap-2 max-w-full overflow-x-auto pb-2">
          <Button
            onClick={() => setSelectedCategory(undefined)}
            variant={!selectedCategory ? 'default' : 'outline'}
            size="sm"
            className="flex items-center"
          >
            <FilterX className="mr-1 h-4 w-4" />
            All
          </Button>
          <Button
            onClick={() => setSelectedCategory('dry')}
            variant={selectedCategory === 'dry' ? 'default' : 'outline'}
            size="sm"
          >
            Dry Goods
          </Button>
          <Button
            onClick={() => setSelectedCategory('vegetable')}
            variant={selectedCategory === 'vegetable' ? 'default' : 'outline'}
            size="sm"
          >
            Vegetables
          </Button>
          <Button
            onClick={() => setSelectedCategory('fruit')}
            variant={selectedCategory === 'fruit' ? 'default' : 'outline'}
            size="sm"
          >
            Fruits
          </Button>
          <Button
            onClick={() => setSelectedCategory('dairy')}
            variant={selectedCategory === 'dairy' ? 'default' : 'outline'}
            size="sm"
          >
            Dairy
          </Button>
          <Button
            onClick={() => setSelectedCategory('meat')}
            variant={selectedCategory === 'meat' ? 'default' : 'outline'}
            size="sm"
          >
            Meat
          </Button>
          <Button
            onClick={() => setSelectedCategory('frozen')}
            variant={selectedCategory === 'frozen' ? 'default' : 'outline'}
            size="sm"
          >
            Frozen
          </Button>
          <Button
            onClick={() => setSelectedCategory('bakery')}
            variant={selectedCategory === 'bakery' ? 'default' : 'outline'}
            size="sm"
          >
            Bakery
          </Button>
          <Button
            onClick={() => setSelectedCategory('other')}
            variant={selectedCategory === 'other' ? 'default' : 'outline'}
            size="sm"
          >
            Other
          </Button>
        </div>

        {/* Sorting select */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-500" />
          <Select
            value={sortOption}
            onValueChange={(value) => setSortOption(value as SortOption)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expiry-asc">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Expiry Date (Earliest First)
                </div>
              </SelectItem>
              <SelectItem value="expiry-desc">
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Expiry Date (Latest First)
                </div>
              </SelectItem>
              <SelectItem value="purchase-asc">
                <div className="flex items-center">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Purchase Date (Oldest First)
                </div>
              </SelectItem>
              <SelectItem value="purchase-desc">
                <div className="flex items-center">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Purchase Date (Newest First)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Ingredients list */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : sortedIngredients && sortedIngredients.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedIngredients.map((ingredient) => (
                  <TableRow
                    key={ingredient._id}
                    className={
                      isExpired(ingredient.expiryDate as Date)
                        ? 'bg-red-50'
                        : ingredient.aboutToExpire ||
                          isExpiringSoon(ingredient.expiryDate as Date)
                        ? 'bg-yellow-50'
                        : ''
                    }
                  >
                    <TableCell>
                      <div className="font-medium">{ingredient.name}</div>
                      {ingredient.additionalInfo && (
                        <div className="text-sm text-muted-foreground">
                          {ingredient.additionalInfo}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getCategoryColor(ingredient.category)}
                      >
                        {ingredient.category.charAt(0).toUpperCase() +
                          ingredient.category.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {ingredient.quantity} {ingredient.unit}
                    </TableCell>
                    <TableCell>{formatDate(ingredient.purchaseDate)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          isExpired(ingredient.expiryDate as Date)
                            ? 'text-red-600 font-medium'
                            : ingredient.aboutToExpire ||
                              isExpiringSoon(ingredient.expiryDate as Date)
                            ? 'text-yellow-600 font-medium'
                            : ''
                        }
                      >
                        {ingredient.expiryDate
                          ? formatDate(ingredient.expiryDate)
                          : 'No expiry'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleEditClick(ingredient)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteClick(ingredient._id!)}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="text-center p-6">
          <p className="text-muted-foreground mb-4">
            Your inventory is empty. Add some ingredients to get started.
          </p>
          <div className="flex justify-center gap-2">
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Manually
            </Button>
            <Button onClick={() => navigate('/purchases')} variant="outline">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Upload Receipt
            </Button>
          </div>
        </Card>
      )}

      {/* Modals */}
      <AddIngredientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={() => refetch()}
      />

      {selectedIngredient && (
        <EditIngredientModal
          ingredient={selectedIngredient}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          onSuccess={() => {
            setSelectedIngredient(null);
            refetch();
          }}
        />
      )}
    </div>
  );
};

export default InventoryPage;
