import mongoose, {Schema, model, models, Document} from "mongoose";

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "E-mail é obrigatório."],
      unique: true, // Garante que cada e-mail seja único
      trim: true, // Remove espaços extras
      lowercase: true, // Armazena em minúsculas para consistência
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Por favor, use um e-mail válido.",
      ], // Validação de formato
      index: true, // Indexado para buscas rápidas e unicidade
    },
    passwordHash: {
      type: String,
      required: [true, "Senha é obrigatória."],
      // A senha NUNCA será armazenada aqui diretamente.
      // lógica de autenticação com bcrypt gerará o hash ANTES de salvar.
    },
    name: {
      type: String,
      trim: true,
    },
  },
  {timestamps: true}
); // Adiciona createdAt e updatedAt

// Remove o passwordHash ao converter para JSON (segurança)
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.passwordHash;
  return user;
};

export const User = mongoose.models.User || model<IUser>("User", userSchema);
