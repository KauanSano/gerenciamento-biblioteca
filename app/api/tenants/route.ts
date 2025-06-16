// app/api/tenants/route.ts

import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import {Tenant} from "@/lib/models/tenant.model";
import {Membership, IMembership} from "@/lib/models/membership.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "../auth/[...nextauth]/route";

// Função POST (criar tenant) - Atualizada para impedir múltiplos tenants por owner
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

    // --- LÓGICA DE VALIDAÇÃO ADICIONADA ---
    // Verifica se o usuário já é 'owner' de algum tenant.
    const existingTenantAsOwner = await Tenant.findOne({owner: userId}).lean();
    if (existingTenantAsOwner) {
      return NextResponse.json(
        {message: "Você já é proprietário de uma loja e não pode criar outra."},
        {status: 409} // 409 Conflict - Ação não permitida pelo estado atual.
      );
    }
    // --- FIM DA VALIDAÇÃO ---

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

// Função GET para listar os tenants do usuário (mantida como está)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }
  const userId = (session.user as any).id;

  try {
    await dbConnect();

    const memberships = await Membership.find({user: userId, status: "active"})
      .populate<{tenant: Pick<typeof Tenant, "_id" | "name">}>({
        path: "tenant",
        select: "_id name",
      })
      .sort({createdAt: 1})
      .lean();

    const userTenants = memberships
      .map(mem => {
        if (mem.tenant) {
          return {
            id: (mem.tenant as any)._id.toString(),
            name: (mem.tenant as any).name,
            role: mem.role,
          };
        }
        return null;
      })
      .filter(Boolean);

    return NextResponse.json({data: userTenants}, {status: 200});
  } catch (error: any) {
    console.error("Erro ao listar tenants do usuário:", error);
    return NextResponse.json(
      {message: "Erro interno do servidor ao buscar suas lojas/sebos."},
      {status: 500}
    );
  }
}
