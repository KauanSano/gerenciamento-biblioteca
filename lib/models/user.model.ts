import mongoose, {Schema, Document, Model} from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  image?: string;
  cnpj?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: {type: String, required: true},
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {type: String, select: false}, // select: false para não retornar a senha em queries normais
    image: {type: String},
    cnpj: {type: String, trim: true}, // Campo opcional ou obrigatório conforme sua regra de negócio
  },
  {timestamps: true},
);

// Evita re-compilação do model em desenvolvimento (Hot Reload do Next.js)
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
