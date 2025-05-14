// app/api/tenants/route.ts

import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import {Tenant} from "@/lib/models/tenant.model";
import {Membership} from "@/lib/models/membership.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "../auth/[...nextauth]/route";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  // Proteção: Precisa estar logado
  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }
  const userId = (session.user as any).id; // Pega o ID do usuário logado

  try {
    const {name} = await request.json(); // Pega o nome da loja do corpo da requisição

    // Validação simples
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {message: "Nome da loja é obrigatório."},
        {status: 400}
      );
    }
    const trimmedName = name.trim();

    await dbConnect();

    // Cria o novo Tenant, associando ao usuário como 'owner'
    const newTenant = new Tenant({
      name: trimmedName,
      owner: userId,
      // Adicione valores padrão para outros campos se necessário
      subscriptionStatus: "trialing", // Exemplo
    });
    await newTenant.save();

    // Cria a associação (Membership) do usuário com o novo Tenant como 'owner'
    const newMembership = new Membership({
      user: userId,
      tenant: newTenant._id, // Usa o ID do tenant recém-criado
      role: "owner",
      status: "active",
    });
    await newMembership.save();

    console.log(
      `Tenant "${trimmedName}" (ID: ${newTenant._id}) criado para User ${userId}`
    );

    // Retorna os dados do tenant criado (sem dados sensíveis da membership)
    // O cliente precisará chamar session.update() para refletir o novo tenant ativo
    return NextResponse.json({data: newTenant.toObject()}, {status: 201});
  } catch (error: any) {
    console.error("Erro ao criar tenant:", error);
    // Trata erro se já existir um membership para user/tenant (embora não devesse acontecer na criação)
    if (
      error.code === 11000 &&
      error.message.includes("index: user_1_tenant_1")
    ) {
      return NextResponse.json(
        {message: "Erro: Associação já existe?"},
        {status: 409}
      );
    }
    if (error.name === "ValidationError") {
      return NextResponse.json(
        {message: "Erro de validação.", errors: error.errors},
        {status: 400}
      );
    }
    return NextResponse.json(
      {message: "Erro interno do servidor ao criar a loja."},
      {status: 500}
    );
  }
}

// Poderia adicionar um GET /api/tenants aqui depois para listar os tenants do usuário
