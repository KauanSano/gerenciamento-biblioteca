import mongoose, {Schema, Document, Model} from "mongoose";

export interface IBook extends Document {
  title: string;
  authors: string[];
  isbn?: string;
  isbn13?: string;
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories?: string[];
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema: Schema<IBook> = new Schema(
  {
    title: {type: String, required: true, index: true},
    authors: {type: [String], default: []},
    isbn: {type: String, trim: true, index: true},
    isbn13: {type: String, trim: true, index: true},
    publisher: {type: String},
    publishedDate: {type: String},
    description: {type: String},
    pageCount: {type: Number},
    categories: {type: [String]},
    imageLinks: {
      smallThumbnail: {type: String},
      thumbnail: {type: String},
    },
    language: {type: String, default: "pt-BR"},
  },
  {timestamps: true},
);

// Índices para busca rápida
BookSchema.index({title: "text", isbn: 1, isbn13: 1});

// Evita re-compilação do model em ambiente serverless
const Book: Model<IBook> =
  mongoose.models.Book || mongoose.model<IBook>("Book", BookSchema);

export default Book;
