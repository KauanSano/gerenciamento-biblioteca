// app/api/tenants/[tenantId]/members/route.ts
import {NextResponse} from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/dbConnect";
import {Membership} from "@/lib/models/membership.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "../../../auth/[...nextauth]/route";

interface RouteContext {
  params: {
    tenantId: string;
  };
}

// GET: Listar todos os membros de uma loja (tenant)
export async function GET(request: Request, {params}: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }

  const {tenantId} = params;
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return NextResponse.json({message: "ID da loja inválido."}, {status: 400});
  }

  // Verifica se o usuário que faz a requisição é membro da loja
  const requesterMembership = await Membership.findOne({
    user: session.user.id,
    tenant: tenantId,
  });
  if (!requesterMembership) {
    return NextResponse.json({message: "Acesso negado."}, {status: 403});
  }

  try {
    await dbConnect();
    const members = await Membership.find({tenant: tenantId})
      .populate("user", "name email image") // Popula com dados do usuário
      .sort({createdAt: "asc"})
      .lean();

    return NextResponse.json({data: members}, {status: 200});
  } catch (error) {
    console.error("Erro ao listar membros da loja:", error);
    return NextResponse.json(
      {message: "Erro interno do servidor."},
      {status: 500}
    );
  }
}
