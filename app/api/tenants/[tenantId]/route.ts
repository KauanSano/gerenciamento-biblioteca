// app/api/tenants/[tenantId]/route.ts
import {NextResponse} from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/dbConnect";
import {Tenant} from "@/lib/models/tenant.model";
import {Membership} from "@/lib/models/membership.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "../../auth/[...nextauth]/route";

interface RouteContext {
  params: {
    tenantId: string;
  };
}

// Helper para verificar permissão do usuário no tenant
async function checkUserPermission(
  userId: string,
  tenantId: string,
  allowedRoles: string[]
) {
  const membership = await Membership.findOne({
    user: userId,
    tenant: tenantId,
  }).lean();
  if (!membership || !allowedRoles.includes(membership.role)) {
    return false;
  }
  return true;
}

// GET: Obter detalhes de um tenant específico
export async function GET(request: Request, {params}: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }

  const {tenantId} = params;
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return NextResponse.json({message: "ID da loja inválido."}, {status: 400});
  }

  // Verifica se o usuário é membro da loja que está tentando acessar
  const hasPermission = await checkUserPermission(session.user.id, tenantId, [
    "owner",
    "admin",
    "staff",
  ]);
  if (!hasPermission) {
    return NextResponse.json(
      {message: "Acesso negado a esta loja."},
      {status: 403}
    );
  }

  try {
    await dbConnect();
    const tenant = await Tenant.findById(tenantId).lean();
    if (!tenant) {
      return NextResponse.json(
        {message: "Loja não encontrada."},
        {status: 404}
      );
    }
    return NextResponse.json({data: tenant}, {status: 200});
  } catch (error) {
    console.error("Erro ao buscar detalhes da loja:", error);
    return NextResponse.json(
      {message: "Erro interno do servidor."},
      {status: 500}
    );
  }
}

// PUT: Atualizar detalhes de um tenant específico
export async function PUT(request: Request, {params}: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }

  const {tenantId} = params;
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return NextResponse.json({message: "ID da loja inválido."}, {status: 400});
  }

  // Apenas 'owner' ou 'admin' podem editar os detalhes da loja
  const hasPermission = await checkUserPermission(session.user.id, tenantId, [
    "owner",
    "admin",
  ]);
  if (!hasPermission) {
    return NextResponse.json(
      {message: "Você não tem permissão para editar esta loja."},
      {status: 403}
    );
  }

  try {
    const body = await request.json();

    // Filtra os campos que podem ser atualizados para evitar modificações indevidas
    const allowedUpdates: {[key: string]: any} = {};
    const updatableFields = ["name", "cnpj", "phone", "address"];

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        allowedUpdates[field] = body[field];
      }
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        {message: "Nenhum campo para atualizar foi fornecido."},
        {status: 400}
      );
    }

    await dbConnect();

    const updatedTenant = await Tenant.findByIdAndUpdate(
      tenantId,
      {$set: allowedUpdates},
      {new: true, runValidators: true} // Retorna o documento atualizado e roda as validações
    );

    if (!updatedTenant) {
      return NextResponse.json(
        {message: "Loja não encontrada para atualização."},
        {status: 404}
      );
    }

    return NextResponse.json(
      {message: "Loja atualizada com sucesso.", data: updatedTenant},
      {status: 200}
    );
  } catch (error: any) {
    console.error("Erro ao atualizar a loja:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json(
        {message: "Dados inválidos.", errors: error.errors},
        {status: 400}
      );
    }
    return NextResponse.json(
      {message: "Erro interno do servidor."},
      {status: 500}
    );
  }
}
