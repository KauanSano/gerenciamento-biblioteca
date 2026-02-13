import {NextResponse} from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/db/dbConnect";
import User from "@/lib/models/user.model";
import Profile from "@/lib/models/profile.model";

export async function POST(req: Request) {
  try {
    const {name, email, password, cnpj} = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        {error: "Nome, email e senha são obrigatórios."},
        {status: 400},
      );
    }

    await dbConnect();

    // Verifica se usuário já existe
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return NextResponse.json(
        {error: "Este email já está cadastrado."},
        {status: 400},
      );
    }

    // Cria o Usuário (Conta Principal)
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      cnpj,
    });

    // CRIAÇÃO AUTOMÁTICA DO PRIMEIRO PERFIL (ADMIN)
    await Profile.create({
      user: newUser._id,
      name: name.split(" ")[0], // Pega o primeiro nome
      role: "admin",
      avatar: "admin-avatar",
    });

    return NextResponse.json(
      {message: "Usuário criado com sucesso", userId: newUser._id},
      {status: 201},
    );
  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json(
      {error: "Erro interno ao criar conta."},
      {status: 500},
    );
  }
}
