// frontend\src\pages\PurchaseDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetPurchaseById,
  useUpdatePurchaseItems,
  useAddPurchaseToInventory,
  PurchaseItem,
} from '../api/PurchaseApi';
import { format } from 'date-fns';
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft, Save, ShoppingBag, Edit, ArrowLeft } from 'lucide-react';

const PurchaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { purchase, isLoading, refetch } = useGetPurchaseById(id);
  const updatePurchase = useUpdatePurchaseItems();
  const addToInventory = useAddPurchaseToInventory();

  const [editedItems, setEditedItems] = useState<PurchaseItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToInventory, setIsAddingToInventory] = useState(false);

  useEffect(() => {
    if (purchase && purchase.items) {
      setEditedItems(JSON.parse(JSON.stringify(purchase.items)));
    }
  }, [purchase]);

  const handleSaveItems = async () => {
    if (!id) return;

    setIsSaving(true);
    try {
      await updatePurchase.mutateAsync({ id, items: editedItems });
      setIsEditing(false);
      toast.success('Items updated successfully');
      refetch();
    } catch (error) {
      console.error('Error updating items:', error);
      toast.error('Failed to update items');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToInventory = async () => {
    if (!id) return;

    setIsAddingToInventory(true);
    try {
      // Get the response from the API call
      const result = await addToInventory.mutateAsync({ id });

      // Update the local state with the updated purchase data
      if (result && result.purchase && result.purchase.items) {
        setEditedItems(result.purchase.items);
      }

      // Force a refetch to update the UI
      await refetch();

      // Display a toast notification
      toast.success(`Added ${result.ingredients.length} items to inventory`);
    } catch (error) {
      console.error('Error adding to inventory:', error);
      toast.error('Failed to add items to inventory');
    } finally {
      setIsAddingToInventory(false);
    }
  };

  const handleItemChange = (
    index: number,
    field: keyof PurchaseItem,
    value: any
  ) => {
    const updatedItems = [...editedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setEditedItems(updatedItems);
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

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Purchase not found</h2>
          <Button
            onClick={() => navigate('/purchases')}
            className="mt-4"
            variant="default"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Button>
        </div>
      </div>
    );
  }

  // Check if all items are already added to inventory
  const allItemsAdded = purchase.items.every((item) => item.addedToInventory);
  // Count pending items
  const pendingItemsCount = purchase.items.filter(
    (item) => !item.addedToInventory
  ).length;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl">Purchase Details</CardTitle>
            <CardDescription>
              {purchase.store ? `${purchase.store} - ` : ''}
              {format(new Date(purchase.date), 'MMMM d, yyyy')}
            </CardDescription>
          </div>

          <div className="flex space-x-2">
            <Button
              onClick={() => navigate('/purchases')}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Button>

            {!isEditing && !allItemsAdded && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Items
              </Button>
            )}

            {isEditing && (
              <Button
                onClick={handleSaveItems}
                disabled={isSaving}
                variant="default"
                size="sm"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}

            {!allItemsAdded && !isEditing && (
              <Button
                onClick={handleAddToInventory}
                disabled={isAddingToInventory}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                {isAddingToInventory
                  ? 'Processing...'
                  : `Add to Inventory${
                      pendingItemsCount > 0 ? ` (${pendingItemsCount})` : ''
                    }`}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* Items table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Quantity</TableHead>
                {isEditing && <TableHead>Expiry Date</TableHead>}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {editedItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(index, 'name', e.target.value)
                        }
                        className="w-full"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">
                        {item.name}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        value={item.category}
                        onValueChange={(value) =>
                          handleItemChange(index, 'category', value)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dry">Dry</SelectItem>
                          <SelectItem value="vegetable">Vegetable</SelectItem>
                          <SelectItem value="fruit">Fruit</SelectItem>
                          <SelectItem value="dairy">Dairy</SelectItem>
                          <SelectItem value="meat">Meat</SelectItem>
                          <SelectItem value="frozen">Frozen</SelectItem>
                          <SelectItem value="bakery">Bakery</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={getCategoryColor(item.category)}
                      >
                        {item.category.charAt(0).toUpperCase() +
                          item.category.slice(1)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'quantity',
                              Number(e.target.value)
                            )
                          }
                          className="w-20"
                          min="0.1"
                          step="0.1"
                        />
                        <Input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            handleItemChange(index, 'unit', e.target.value)
                          }
                          className="w-20"
                          placeholder="unit"
                        />
                      </div>
                    ) : (
                      <span>
                        {item.quantity} {item.unit}
                      </span>
                    )}
                  </TableCell>
                  {isEditing && (
                    <TableCell>
                      {item.category !== 'dry' ? (
                        <Input
                          type="date"
                          value={
                            item.expiryDate
                              ? new Date(item.expiryDate)
                                  .toISOString()
                                  .split('T')[0]
                              : ''
                          }
                          onChange={(e) =>
                            handleItemChange(
                              index,
                              'expiryDate',
                              e.target.value ? new Date(e.target.value) : null
                            )
                          }
                          className="w-full"
                        />
                      ) : (
                        <span className="text-gray-500">N/A (Dry goods)</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    {item.addedToInventory ? (
                      <Badge
                        variant="outline"
                        className="bg-green-100 text-green-800"
                      >
                        In Inventory
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-yellow-100 text-yellow-800"
                      >
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {allItemsAdded && (
            <div className="mt-4 p-4 bg-green-50 text-green-800 rounded-lg">
              All items from this purchase have been added to your inventory.
            </div>
          )}
        </CardContent>
      </Card>

      {isEditing && (
        <div className="mt-4 flex justify-end space-x-2">
          <Button
            onClick={() => {
              setEditedItems(JSON.parse(JSON.stringify(purchase.items)));
              setIsEditing(false);
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveItems}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default PurchaseDetailPage;
