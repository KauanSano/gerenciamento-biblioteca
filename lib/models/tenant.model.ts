import mongoose, {Schema, model, models, Document} from "mongoose";

export interface ITenant extends Document {
  name: string;
  owner: mongoose.Schema.Types.ObjectId; // Referência ao User dono
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
    // Configurações específicas da loja
    currency?: string; // Ex: 'BRL'
    // Adicione outras configs necessárias
  };
  subscriptionStatus?: "active" | "inactive" | "trialing" | "past_due"; // Para fase de assinatura
  subscriptionId?: string; // ID da assinatura no gateway de pagamento
  // Adicione outros campos (logoUrl, website, etc.)
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
      // Quem criou/é o dono principal
      type: Schema.Types.ObjectId,
      ref: "User", // Referencia o modelo User
      required: true,
      index: true, // Facilita buscar todas as lojas de um usuário
    },
    address: {
      // Subdocumento para endereço
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
      default: "trialing", // Começa em trial, por exemplo
      index: true,
    },
    subscriptionId: {type: String, index: true}, // Ex: ID do Stripe
  },
  {timestamps: true}
);

export const Tenant =
  mongoose.models.Tenant || model<ITenant>("Tenant", tenantSchema);
