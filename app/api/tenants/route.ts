// app/api/tenants/route.ts

import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import {Tenant} from "@/lib/models/tenant.model";
import {Membership, IMembership} from "@/lib/models/membership.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "../auth/[...nextauth]/route";

// Função POST (criar tenant) - já existente, mantida como está
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }
  const userId = (session.user as any).id;

  try {
    const {name} = await request.json();
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {message: "Nome da loja é obrigatório."},
        {status: 400}
      );
    }
    const trimmedName = name.trim();
    await dbConnect();

    const newTenant = new Tenant({
      name: trimmedName,
      owner: userId,
      subscriptionStatus: "trialing",
    });
    await newTenant.save();

    const newMembership = new Membership({
      user: userId,
      tenant: newTenant._id,
      role: "owner",
      status: "active",
    });
    await newMembership.save();

    console.log(
      `Tenant "${trimmedName}" (ID: ${newTenant._id}) criado para User ${userId}`
    );
    return NextResponse.json({data: newTenant.toObject()}, {status: 201});
  } catch (error: any) {
    console.error("Erro ao criar tenant:", error);
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

// --- NOVO --- Função GET para listar os tenants do usuário
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }
  const userId = (session.user as any).id;

  try {
    await dbConnect();

    // Busca todos os memberships ativos para o usuário
    const memberships = await Membership.find({user: userId, status: "active"})
      .populate<{tenant: Pick<typeof Tenant, "_id" | "name">}>({
        // Tipagem para populate
        path: "tenant", // Popula os dados do tenant referenciado
        select: "_id name", // Seleciona apenas o ID e o nome do tenant
      })
      .sort({createdAt: 1}) // Ordena (opcional, ex: pela data de criação da membership)
      .lean(); // Retorna objetos JS puros

    // Mapeia os resultados para um formato mais simples para o frontend
    const userTenants = memberships
      .map(mem => {
        if (mem.tenant) {
          // Verifica se o tenant foi populado corretamente
          return {
            id: (mem.tenant as any)._id.toString(), // ID do Tenant
            name: (mem.tenant as any).name, // Nome do Tenant
            role: mem.role, // Papel do usuário neste Tenant
          };
        }
        return null; // Caso algo dê errado com o populate
      })
      .filter(Boolean); // Remove quaisquer nulos

    return NextResponse.json({data: userTenants}, {status: 200});
  } catch (error: any) {
    console.error("Erro ao listar tenants do usuário:", error);
    return NextResponse.json(
      {message: "Erro interno do servidor ao buscar suas lojas/sebos."},
      {status: 500}
    );
  }
}
