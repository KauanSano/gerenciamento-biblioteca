import mongoose, {Schema, Document, Model} from "mongoose";

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId; // O dono da conta (Pai/Biblioteca Principal)
  name: string;
  avatar?: string; // URL ou identificador de ícone
  pin?: string; // 4 dígitos numéricos
  role: "admin" | "member"; // Admin tem acesso total, member apenas leitura
  createdAt: Date;
  updatedAt: Date;
}

const ProfileSchema: Schema<IProfile> = new Schema(
  {
    user: {type: Schema.Types.ObjectId, ref: "User", required: true},
    name: {type: String, required: true, trim: true},
    avatar: {type: String, default: "default-avatar"},
    pin: {type: String, maxlength: 4}, // Opcional
    role: {type: String, enum: ["admin", "member"], default: "member"},
  },
  {timestamps: true},
);

// Evita re-compilação do model em ambiente serverless
const Profile: Model<IProfile> =
  mongoose.models.Profile || mongoose.model<IProfile>("Profile", ProfileSchema);

export default Profile;
