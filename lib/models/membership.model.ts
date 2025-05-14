import mongoose, {Schema, model, models, Document} from "mongoose";

export type TenantRole = "owner" | "admin" | "staff"; // Exemplo de papéis
export type MembershipStatus = "active" | "pending" | "inactive"; // Exemplo de status

export interface IMembership extends Document {
  user: mongoose.Schema.Types.ObjectId; // Ref User
  tenant: mongoose.Schema.Types.ObjectId; // Ref Tenant
  role: TenantRole;
  status: MembershipStatus;
  invitedBy?: mongoose.Schema.Types.ObjectId; // Quem convidou (opcional)
  createdAt?: Date;
  updatedAt?: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    tenant: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "staff"] as TenantRole[],
      required: [true, "Papel do usuário na loja é obrigatório."],
      default: "staff",
    },
    status: {
      type: String,
      enum: ["active", "pending", "inactive"] as MembershipStatus[],
      default: "active",
      index: true,
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {timestamps: true}
);

// Índice composto para garantir que um usuário só tenha UMA entrada por tenant
membershipSchema.index({user: 1, tenant: 1}, {unique: true});
// Índices individuais para buscas rápidas
membershipSchema.index({user: 1});
membershipSchema.index({tenant: 1});

export const Membership =
  mongoose.models.Membership ||
  model<IMembership>("Membership", membershipSchema);
