// frontend\src\components\ReceiptUploaderModal.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth0 } from '@auth0/auth0-react';
import { toast } from 'sonner';

type ReceiptUploaderModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ReceiptUploaderModal = ({
  open,
  onOpenChange,
}: ReceiptUploaderModalProps) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [store, setStore] = useState('');
  const [isHebrewReceipt, setIsHebrewReceipt] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { getAccessTokenSilently } = useAuth0();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!receiptFile) {
      toast.error('Please select a receipt image');
      return;
    }

    setLoading(true);

    try {
      const accessToken = await getAccessTokenSilently();

      // Create FormData to send the file
      const formData = new FormData();
      formData.append('receiptImage', receiptFile);
      formData.append('store', store);
      formData.append('date', new Date().toISOString());
      // Add the language flag
      formData.append('isHebrew', isHebrewReceipt.toString());

      // Send to your backend endpoint
      const response = await fetch(
        `${API_BASE_URL}/api/purchases/process-receipt-image`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server response error:', errorData);
        throw new Error(errorData.message || 'Failed to process receipt');
      }

      const result = await response.json();

      toast.success(`Receipt processed - ${result.items.length} items found`);

      // Navigate to the purchase detail page to review the items
      onOpenChange(false);
      navigate(`/purchases/${result._id}`);
    } catch (error) {
      console.error('Full error object:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error processing receipt'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Upload Receipt</DialogTitle>
          <DialogDescription>
            Upload a picture of your receipt to extract grocery items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="store">Store Name (Optional)</Label>
            <Input
              id="store"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="e.g., Walmart, Kroger, etc."
            />
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="receiptFile">Receipt Image</Label>
            <Input
              id="receiptFile"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              Upload a clear image of your receipt
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hebrew-receipt"
              checked={isHebrewReceipt}
              onCheckedChange={(checked) => setIsHebrewReceipt(!!checked)}
            />
            <Label
              htmlFor="hebrew-receipt"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Receipt is in Hebrew
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || !receiptFile}>
              {loading ? 'Processing...' : 'Process Receipt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReceiptUploaderModal;
