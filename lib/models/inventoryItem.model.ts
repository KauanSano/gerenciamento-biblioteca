// src/models/inventoryItem.model.ts
import mongoose, {Schema, model, models, Document} from "mongoose";
// Importa tipos dos outros schemas se necessário (ou define aqui)
import {CondicaoLivro, AcabamentoLivro, IdiomaLivro} from "./bookSchema"; // Exemplo importando do schema antigo - idealmente defina aqui ou em types
import {IPrice, IStock} from "./bookSchema"; // Exemplo - idealmente defina subschemas aqui

// --- Subschemas para Preço e Estoque específicos do Item ---
const priceSubSchema = new Schema<IPrice>(
  {
    // Reutiliza interface, mas schema local
    cost: {type: Number, required: false}, // Custo deste exemplar específico
    sale: {
      type: Number,
      required: [true, "Preço de venda do item é obrigatório."],
    },
    discount: {
      type: {type: String, enum: ["percentage", "fixed"]},
      value: {type: Number},
    },
  },
  {_id: false}
); // _id: false para não criar ID para subdocumento

const stockSubSchema = new Schema<IStock>(
  {
    // Reutiliza interface, mas schema local
    own: {type: Number, default: 0, min: 0}, // Estoque físico próprio deste SKU
    consigned: {type: Number, default: 0, min: 0}, // Consignado deste SKU
  },
  {_id: false}
);

// --- Schema Principal do Item de Inventário ---
export interface IInventoryItem extends Document {
  tenant: mongoose.Schema.Types.ObjectId; // Loja dona do item
  bookMetadata: mongoose.Schema.Types.ObjectId; // Link para os dados canônicos do livro
  sku: string; // Identificador ÚNICO do item DENTRO da loja
  condition: CondicaoLivro;
  price: IPrice; // Preço específico deste item
  stock: IStock; // Quantidade em estoque deste item
  binding?: AcabamentoLivro; // Acabamento específico (pode diferir)
  language?: IdiomaLivro; // Idioma específico (pode diferir)
  description?: string; // Descrição específica do lojista para este item
  label?: string; // Etiqueta/Localização interna
  coverImageUrl?: string; // Foto específica deste exemplar (opcional)
  isResale?: boolean;
  status: "available" | "reserved" | "sold" | "delisted"; // Status do item
  addedBy?: mongoose.Schema.Types.ObjectId; // Usuário que adicionou
  createdAt?: Date;
  updatedAt?: Date;
}

const inventoryItemSchema = new Schema<IInventoryItem>(
  {
    tenant: {
      // Ligação obrigatória com a loja
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    bookMetadata: {
      // Ligação obrigatória com os dados do livro
      type: Schema.Types.ObjectId,
      ref: "BookMetadata",
      required: true,
      index: true,
    },
    sku: {
      // SKU é obrigatório E único DENTRO de cada tenant
      type: String,
      required: [true, "SKU é obrigatório para o item de inventário."],
      trim: true,
      // Índice composto unique: true garante unicidade de SKU por Tenant
    },
    condition: {
      type: String,
      enum: ["novo", "usado"] as CondicaoLivro[],
      required: [true, "Condição do item é obrigatória."],
    },
    price: {
      type: priceSubSchema,
      required: true,
    },
    stock: {
      type: stockSubSchema,
      required: true,
    },
    binding: {
      // Acabamento específico do exemplar
      type: String,
      enum: ["brochura", "capa dura", "espiral", "outro"] as AcabamentoLivro[],
      default: "outro", // Default sensato
    },
    language: {
      // Idioma específico do exemplar
      type: String,
      enum: ["português", "inglês", "espanhol", "outro"] as IdiomaLivro[],
      default: "outro", // Default sensato
    },
    description: {type: String, trim: true}, // Descrição do lojista
    label: {type: String, trim: true}, // Localização/Etiqueta
    coverImageUrl: {type: String, trim: true}, // Foto do exemplar específico
    isResale: {type: Boolean, default: false},
    status: {
      type: String,
      enum: ["available", "reserved", "sold", "delisted"],
      default: "available",
      required: true,
      index: true, // Para buscar por status
    },
    addedBy: {
      // Usuário que cadastrou (dentro do tenant)
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {timestamps: true}
);

// Índice composto para garantir SKU único POR TENANT
inventoryItemSchema.index({tenant: 1, sku: 1}, {unique: true});
// Índice adicional para buscar todos os itens de um livro específico em um tenant
inventoryItemSchema.index({tenant: 1, bookMetadata: 1});

export const InventoryItem =
  mongoose.models.InventoryItem ||
  model<IInventoryItem>("InventoryItem", inventoryItemSchema);
