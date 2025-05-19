// models/inventoryItem.model.ts
// (Assumindo que está em src/lib/models/inventoryItem.model.ts ou similar)
import mongoose, {Schema, model, models, Document} from "mongoose";

// Tipos de Enum (podem vir de um arquivo de tipos compartilhado ou definidos aqui)
export type CondicaoLivro = "novo" | "usado";
export type AcabamentoLivro = "brochura" | "capa dura" | "espiral" | "outro";
export type IdiomaLivro = "português" | "inglês" | "espanhol" | "outro";

// Subschemas para Preço e Estoque
interface IPriceData {
  // Interface para os dados, não para o Document Mongoose
  cost?: number;
  sale: number;
  discount?: {type: "percentage" | "fixed"; value: number};
}
const priceSubSchema = new Schema<IPriceData>(
  {
    cost: {type: Number, required: false},
    sale: {type: Number, required: [true, "Preço de venda é obrigatório."]},
    discount: {
      type: {type: String, enum: ["percentage", "fixed"]},
      value: {type: Number},
    },
  },
  {_id: false}
);

interface IStockData {
  // Interface para os dados
  own: number;
  consigned: number;
}
const stockSubSchema = new Schema<IStockData>(
  {
    own: {type: Number, default: 0, min: 0},
    consigned: {type: Number, default: 0, min: 0},
  },
  {_id: false}
);

// Interface Principal do Item de Inventário
export interface IInventoryItem extends Document {
  tenant: mongoose.Schema.Types.ObjectId;
  sku: string;

  // Campos de Metadados do Livro (AGORA DIRETAMENTE AQUI)
  title: string;
  authors?: string[];
  publisher?: string;
  year?: number;
  isbn?: string; // ISBN da obra, não único globalmente, pode ser opcional
  pageCount?: number;
  subjects?: string[]; // Categorias/Assuntos
  description?: string; // Descrição GERAL do livro
  coverImageUrl?: string; // URL da capa (pode ser a padrão ou a específica do exemplar)

  // Campos Específicos do Exemplar
  condition: CondicaoLivro;
  price: IPriceData; // Usa a interface de dados
  stock: IStockData; // Usa a interface de dados
  binding?: AcabamentoLivro;
  language?: IdiomaLivro;
  itemSpecificDescription?: string; // Descrição específica do lojista para este exemplar
  // itemSpecificCoverImageUrl?: string; // Se quiser uma capa SÓ para este exemplar, diferente da geral
  label?: string; // Etiqueta/Localização interna
  isResale?: boolean;
  status: "available" | "reserved" | "sold" | "delisted";
  addedBy?: mongoose.Schema.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    sku: {type: String, required: [true, "SKU é obrigatório."], trim: true},

    // Campos de Metadados do Livro
    title: {
      type: String,
      required: [true, "Título é obrigatório."],
      trim: true,
      index: true,
    },
    authors: {type: [String], default: []},
    publisher: {type: String, trim: true},
    year: {type: Number},
    isbn: {type: String, trim: true, index: true},
    pageCount: {type: Number},
    subjects: {type: [String], default: []},
    description: {type: String, trim: true}, // Descrição base do livro
    coverImageUrl: {type: String, trim: true}, // URL da capa principal/padrão

    // Campos Específicos do Exemplar
    condition: {
      type: String,
      enum: ["novo", "usado"] as CondicaoLivro[],
      required: [true, "Condição é obrigatória."],
    },
    price: {type: priceSubSchema, required: true},
    stock: {type: stockSubSchema, required: true},
    binding: {
      type: String,
      enum: ["brochura", "capa dura", "espiral", "outro"] as AcabamentoLivro[],
      default: "outro",
    },
    language: {
      type: String,
      enum: ["português", "inglês", "espanhol", "outro"] as IdiomaLivro[],
      default: "português",
    },
    itemSpecificDescription: {type: String, trim: true},
    // itemSpecificCoverImageUrl: { type: String, trim: true },
    label: {type: String, trim: true},
    isResale: {type: Boolean, default: false},
    status: {
      type: String,
      enum: ["available", "reserved", "sold", "delisted"],
      default: "available",
      required: true,
      index: true,
    },
    addedBy: {type: Schema.Types.ObjectId, ref: "User"},
  },
  {timestamps: true}
);

// Índice composto para garantir SKU único POR TENANT
inventoryItemSchema.index({tenant: 1, sku: 1}, {unique: true});

export const InventoryItem =
  mongoose.models.InventoryItem ||
  model<IInventoryItem>("InventoryItem", inventoryItemSchema);
