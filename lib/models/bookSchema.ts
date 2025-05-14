import mongoose, {Schema, model, models, Document} from "mongoose";

// --- Tipos Exportados ---
export type CondicaoLivro = "novo" | "usado";
export type AcabamentoLivro = "brochura" | "capa dura" | "espiral" | "outro";
export type IdiomaLivro = "português" | "inglês" | "espanhol" | "outro";

// --- Interfaces Mongoose ---
interface IPrice extends Document {
  cost?: number; // <-- Alterado para opcional
  sale: number;
  discount?: {
    type: "percentage" | "fixed";
    value: number;
  };
}

interface IStock extends Document {
  own: number;
  consigned: number;
}

export interface IBook extends Document {
  title: string;
  author: string;
  publisher: string;
  year?: number;
  condition: CondicaoLivro;
  isbn?: string;
  sku: string;
  category?: string[];
  binding: AcabamentoLivro;
  language: IdiomaLivro;
  pageCount?: number;
  weight?: number; // Em gramas
  label?: string;
  price: IPrice;
  stock: IStock;
  description?: string;
  cover_image?: string;
  isResale?: boolean;
  metadata?: {
    addedBy?: Schema.Types.ObjectId;
    lastModified?: Date;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// --- Schemas Mongoose ---
const priceSchema = new Schema<IPrice>({
  cost: {type: Number, required: false},
  sale: {type: Number, required: [true, "Preço de venda é obrigatório"]},
  discount: {
    type: {
      type: String,
      enum: ["percentage", "fixed"],
    },
    value: Number,
  },
});

const stockSchema = new Schema<IStock>({
  own: {type: Number, default: 0},
  consigned: {type: Number, default: 0},
});

const bookSchema = new Schema<IBook>(
  {
    title: {
      type: String,
      required: [true, "Título é obrigatório"],
      index: true,
    },
    author: {
      type: String,
      required: [true, "Autor é obrigatório"],
      index: true,
    },
    publisher: {type: String, required: [true, "Editora é obrigatória"]},
    year: {type: Number, required: false}, // <-- required: false
    condition: {
      type: String,
      enum: ["novo", "usado"] as CondicaoLivro[],
      required: [true, "Condição é obrigatória"],
    },
    isbn: {
      type: String,
      required: false,
      index: true,
    },
    sku: {
      // SKU deve ser mantido como obrigatório e único
      type: String,
      required: [true, "SKU é obrigatório (extraído da descrição)"],
      unique: true,
      index: true,
    },
    category: [{type: String}],
    binding: {
      type: String,
      enum: ["brochura", "capa dura", "espiral", "outro"] as AcabamentoLivro[],
      required: [true, "Tipo de acabamento é obrigatório"], // Mantido (default 'outro' no import)
    },
    language: {
      type: String,
      enum: ["português", "inglês", "espanhol", "outro"] as IdiomaLivro[],
      required: [true, "Idioma é obrigatório"],
    },
    pageCount: Number,
    weight: Number, // Em gramas
    label: {
      type: String,
      index: {
        unique: true, // Mantendo único se definido
        sparse: true, // Permite múltiplos documentos sem label
      },
    },
    price: {type: priceSchema, required: true},
    stock: {type: stockSchema, required: true},
    description: String,
    cover_image: String,
    isResale: Boolean,
    metadata: {
      addedBy: {type: Schema.Types.ObjectId, ref: "User"},
      lastModified: {type: Date, default: Date.now},
    },
  },
  {timestamps: true} // Adiciona createdAt e updatedAt
);

// Evita recompilar o modelo
export const Book = mongoose.models.Book || model<IBook>("Book", bookSchema);
