// lib/models/tenant.model.ts
import mongoose, {Schema, model, models, Document} from "mongoose";

export interface ITenant extends Document {
  name: string;
  owner: mongoose.Schema.Types.ObjectId; // Referência ao User dono
  cnpj?: string;
  // Campos opcionais
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  phone?: string;
  settings?: {
    currency?: string;
  };
  subscriptionStatus?: "active" | "inactive" | "trialing" | "past_due";
  subscriptionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const tenantSchema = new Schema<ITenant>(
  {
    name: {
      type: String,
      required: [true, "Nome da loja/sebo é obrigatório."],
      trim: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    cnpj: {
      // NOVO CAMPO
      type: String,
      trim: true,
      // Validação de formato de CNPJ pode ser adicionada aqui com 'match'
    },
    address: {
      street: String,
      number: String,
      complement: String,
      neighborhood: String,
      city: String,
      state: String,
      zipCode: String,
    },
    phone: {type: String, trim: true},
    settings: {
      currency: {type: String, default: "BRL"},
    },
    subscriptionStatus: {
      type: String,
      enum: ["active", "inactive", "trialing", "past_due"],
      default: "trialing",
      index: true,
    },
    subscriptionId: {type: String, index: true},
  },
  {timestamps: true}
);

export const Tenant =
  mongoose.models.Tenant || model<ITenant>("Tenant", tenantSchema);
