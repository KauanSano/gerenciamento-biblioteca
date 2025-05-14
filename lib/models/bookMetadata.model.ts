// src/models/bookMetadata.model.ts
import mongoose, {Schema, model, models, Document} from "mongoose";

export interface IBookMetadata extends Document {
  isbn: string; // O identificador único da OBRA
  title: string;
  authors?: string[]; // Pode ter múltiplos autores
  publisher?: string;
  year?: number;
  pageCount?: number;
  description?: string; // Descrição padrão/oficial
  coverImageUrl?: string; // URL da capa padrão
  subjects?: string[]; // Categorias/Assuntos
  sourceApi?: string; // De onde veio a informação (ex: 'google', 'openlibrary', 'manual')
  // Adicione outros campos relevantes (ex: dimensions, series info)
  createdAt?: Date;
  updatedAt?: Date;
}

const bookMetadataSchema = new Schema<IBookMetadata>(
  {
    isbn: {
      // ISBN da obra DEVE ser único aqui
      type: String,
      required: [true, "ISBN é obrigatório para metadados do livro."],
      unique: true, // Garante que cada ISBN só exista uma vez nesta coleção
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Título é obrigatório."],
      trim: true,
      index: true, // Útil para buscas por título
    },
    authors: {
      type: [String], // Array de strings para múltiplos autores
      default: [],
    },
    publisher: {type: String, trim: true},
    year: {type: Number},
    pageCount: {type: Number},
    description: {type: String, trim: true},
    coverImageUrl: {type: String, trim: true},
    subjects: {
      // Equivalente a categorias
      type: [String],
      default: [],
      index: true, // Indexar para busca por assunto
    },
    sourceApi: {type: String}, // Opcional: rastrear origem do dado
    // Adicione mais campos aqui
  },
  {timestamps: true}
);

export const BookMetadata =
  mongoose.models.BookMetadata ||
  model<IBookMetadata>("BookMetadata", bookMetadataSchema);
