// app/api/register/route.ts

import {NextResponse} from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/db/dbConnect"; // << AJUSTE O CAMINHO
import {User} from "@/lib/models/user.model"; // << AJUSTE O CAMINHO

export async function POST(request: Request) {
  try {
    const {email, password, name} = await request.json();

    // Validação básica
    if (!email || !password) {
      return NextResponse.json(
        {message: "Email e senha são obrigatórios."},
        {status: 400}
      );
    }
    // Adicionar validação de força da senha aqui se desejar

    await dbConnect();

    // Verifica se usuário já existe
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    }).lean();
    if (existingUser) {
      return NextResponse.json(
        {message: "Este e-mail já está em uso."},
        {status: 409}
      ); // 409 Conflict
    }

    // Cria o hash da senha
    const saltRounds = 10; // Fator de custo para o hash
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Cria o novo usuário
    const newUser = new User({
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      name: name,
    });
    await newUser.save();

    // Retorna sucesso (sem dados sensíveis)
    return NextResponse.json(
      {message: "Usuário registrado com sucesso!"},
      {status: 201}
    ); // 201 Created
  } catch (error: any) {
    console.error("Erro no registro:", error);
    // Trata erros de validação do Mongoose que podem ocorrer
    if (error.name === "ValidationError") {
      return NextResponse.json(
        {message: "Erro de validação.", errors: error.errors},
        {status: 400}
      );
    }
    return NextResponse.json(
      {message: "Erro interno do servidor ao registrar usuário."},
      {status: 500}
    );
  }
}
