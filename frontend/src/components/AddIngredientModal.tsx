// frontend\src\components\AddIngredientModal.tsx
import { useState } from 'react';
import { useAddIngredient } from '../api/InventoryApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';

type AddIngredientModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

const AddIngredientModal = ({
  open,
  onOpenChange,
  onSuccess,
}: AddIngredientModalProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('dry');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('unit');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const { mutateAsync: addIngredient, isLoading } = useAddIngredient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addIngredient({
        name,
        category: category as any,
        quantity,
        unit,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        purchaseDate: new Date(),
        additionalInfo,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding ingredient:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Ingredient</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Milk, Eggs, Flour"
              required
            />
          </div>

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dry">Dry Goods</SelectItem>
                <SelectItem value="vegetable">Vegetables</SelectItem>
                <SelectItem value="fruit">Fruits</SelectItem>
                <SelectItem value="dairy">Dairy</SelectItem>
                <SelectItem value="meat">Meat</SelectItem>
                <SelectItem value="frozen">Frozen</SelectItem>
                <SelectItem value="bakery">Bakery</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="0.1"
                step="0.1"
                required
              />
            </div>

            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., kg, L, piece"
              />
            </div>
          </div>

          {category !== 'dry' && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty for default expiry based on category
              </p>
            </div>
          )}

          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="additionalInfo">Additional Info (Optional)</Label>
            <Textarea
              id="additionalInfo"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Brand, notes, etc."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isLoading || !name}>
              {isLoading ? 'Adding...' : 'Add Ingredient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddIngredientModal;
