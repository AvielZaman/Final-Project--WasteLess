// frontend\src\pages\PurchasesPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetPurchases, useDeletePurchase } from '../api/PurchaseApi';
import { format } from 'date-fns';
import ReceiptUploaderModal from '../components/ReceiptUploaderModal';
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

const PurchasesPage = () => {
  const { purchases, isLoading, refetch } = useGetPurchases();
  const deletePurchase = useDeletePurchase();
  const navigate = useNavigate();

  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      await deletePurchase.mutateAsync(id);
      refetch();
    }
  };

  const getPendingItemsCount = (purchase: any) => {
    return purchase.items.filter((item: any) => !item.addedToInventory).length;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Purchases</h1>
        <Button onClick={() => setShowReceiptModal(true)}>
          Add New Purchase
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : purchases && purchases.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => {
                  const pendingItems = getPendingItemsCount(purchase);
                  return (
                    <TableRow
                      key={purchase._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/purchases/${purchase._id}`)}
                    >
                      <TableCell>
                        {format(new Date(purchase.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{purchase.store || 'Unknown Store'}</TableCell>
                      <TableCell>
                        {purchase.items.length} items
                        {purchase.totalAmount
                          ? ` - $${purchase.totalAmount.toFixed(2)}`
                          : ''}
                      </TableCell>
                      <TableCell>
                        {pendingItems > 0 ? (
                          <Badge
                            variant="outline"
                            className="bg-yellow-100 text-yellow-800"
                          >
                            {pendingItems} pending items
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800"
                          >
                            All items added to inventory
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex space-x-2">
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/purchases/${purchase._id}`);
                            }}
                            variant="outline"
                            size="sm"
                          >
                            View
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(purchase._id!);
                            }}
                            variant="destructive"
                            size="sm"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">
            You haven't added any purchases yet.
          </p>
          <Button onClick={() => setShowReceiptModal(true)}>
            Upload Receipt
          </Button>
        </Card>
      )}

      <ReceiptUploaderModal
        open={showReceiptModal}
        onOpenChange={setShowReceiptModal}
      />
    </div>
  );
};

export default PurchasesPage;
