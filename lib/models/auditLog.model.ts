// lib/models/auditLog.model.ts
import mongoose, {Schema, model, models, Document} from "mongoose";

// Define os tipos de ações que podem ser registradas
export type ActionType =
  | "ITEM_CREATED"
  | "ITEM_UPDATED"
  | "ITEM_DELETED"
  | "USER_INVITED"
  | "USER_REMOVED"
  | "USER_ROLE_CHANGED"
  | "TENANT_SETTINGS_UPDATED";

export interface IAuditLog extends Document {
  tenant: mongoose.Schema.Types.ObjectId;
  user: mongoose.Schema.Types.ObjectId;
  action: ActionType;
  details: Record<string, any>;
  createdAt?: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    tenant: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    user: {
      // Usuário que realizou a ação
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: [
        "ITEM_CREATED",
        "ITEM_UPDATED",
        "ITEM_DELETED",
        "USER_INVITED",
        "USER_REMOVED",
        "USER_ROLE_CHANGED",
        "TENANT_SETTINGS_UPDATED",
      ],
      required: true,
    },
    details: {
      // Armazena detalhes contextuais da ação
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {timestamps: {createdAt: true, updatedAt: false}} // Apenas data de criação
);

export const AuditLog =
  mongoose.models.AuditLog || model<IAuditLog>("AuditLog", auditLogSchema);

// Função auxiliar para criar logs de auditoria
export const createAuditLog = async (
  tenant: string,
  user: string,
  action: ActionType,
  details: Record<string, any> = {}
) => {
  try {
    await AuditLog.create({tenant, user, action, details});
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};
