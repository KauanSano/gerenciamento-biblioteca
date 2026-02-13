import mongoose, {Schema, Document, Model} from "mongoose";

export interface IInventoryItem extends Document {
  user: mongoose.Types.ObjectId;

  book: mongoose.Types.ObjectId; // Referência ao livro (metadados)
  sku?: string;
  condition: "new" | "used" | "damaged";
  price: number;
  quantity: number;
  location?: string; // Prateleira A, Caixa 2, etc.
  acquiredDate: Date;
  status: "available" | "sold" | "reserved" | "lost";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryItemSchema: Schema<IInventoryItem> = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    book: {type: Schema.Types.ObjectId, ref: "Book", required: true},
    sku: {type: String, trim: true},
    condition: {
      type: String,
      enum: ["new", "used", "damaged"],
      default: "used",
    },
    price: {type: Number, required: true, min: 0},
    quantity: {type: Number, required: true, min: 0, default: 1},
    location: {type: String, trim: true},
    acquiredDate: {type: Date, default: Date.now},
    status: {
      type: String,
      enum: ["available", "sold", "reserved", "lost"],
      default: "available",
      index: true,
    },
    notes: {type: String},
  },
  {timestamps: true},
);

InventoryItemSchema.index(
  {user: 1, sku: 1},
  {unique: true, partialFilterExpression: {sku: {$exists: true, $gt: ""}}},
);

const InventoryItem: Model<IInventoryItem> =
  mongoose.models.InventoryItem ||
  mongoose.model<IInventoryItem>("InventoryItem", InventoryItemSchema);

export default InventoryItem;
