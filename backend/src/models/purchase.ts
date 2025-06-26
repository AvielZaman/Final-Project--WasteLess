// backend\src\models\purchase.ts
import mongoose from 'mongoose';

const purchaseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: true,
    },
    store: {
      type: String,
    },
    totalAmount: {
      type: Number,
    },
    receiptImage: {
      type: String, // URL to stored image or base64
    },
    items: [
      {
        name: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 1,
        },
        unit: {
          type: String,
          default: 'unit',
        },
        price: {
          type: Number,
        },
        addedToInventory: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // For any additional details like cashier, receipt number, etc.
    additionalInfo: {
      type: String,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Add an index to improve query performance
purchaseSchema.index({ userId: 1, date: -1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);
export default Purchase;
