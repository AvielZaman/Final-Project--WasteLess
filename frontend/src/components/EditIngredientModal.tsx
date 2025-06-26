// frontend\src\components\EditIngredientModal.tsx
import { useState, useEffect } from 'react';
import { useUpdateIngredient, Ingredient } from '../api/InventoryApi';
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

type EditIngredientModalProps = {
  ingredient: Ingredient;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

const EditIngredientModal = ({
  ingredient,
  open,
  onOpenChange,
  onSuccess,
}: EditIngredientModalProps) => {
  const [name, setName] = useState(ingredient.name);
  const [category, setCategory] = useState(ingredient.category);
  const [quantity, setQuantity] = useState(ingredient.quantity);
  const [unit, setUnit] = useState(ingredient.unit);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [additionalInfo, setAdditionalInfo] = useState(
    ingredient.additionalInfo || ''
  );

  const { mutateAsync: updateIngredient, isLoading } = useUpdateIngredient();

  useEffect(() => {
    // Format the date for the input field
    if (ingredient.expiryDate) {
      const date = new Date(ingredient.expiryDate);
      setExpiryDate(date.toISOString().split('T')[0]);
    }
  }, [ingredient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateIngredient({
        _id: ingredient._id,
        name,
        category: category as any,
        quantity,
        unit,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        purchaseDate: ingredient.purchaseDate,
        additionalInfo,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating ingredient:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Ingredient</DialogTitle>
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
              onValueChange={(value) => setCategory(value as any)}
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
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditIngredientModal;
