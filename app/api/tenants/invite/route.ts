// app/api/tenants/invite/route.ts
import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import {User} from "@/lib/models/user.model";
import {Membership} from "@/lib/models/membership.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "../../auth/[...nextauth]/route";

// Helper para verificar a permissão do usuário que está convidando
async function checkInviterPermission(userId: string, tenantId: string) {
  const membership = await Membership.findOne({
    user: userId,
    tenant: tenantId,
  }).lean();
  // Apenas donos e administradores podem convidar
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return false;
  }
  return true;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }

  const inviterId = session.user.id;

  try {
    const {email, role, tenantId} = await request.json();

    // Validação dos dados recebidos
    if (!email || !role || !tenantId) {
      return NextResponse.json(
        {message: "Dados incompletos para o convite."},
        {status: 400}
      );
    }

    await dbConnect();

    // 1. Verificar se quem convida tem permissão
    const hasPermission = await checkInviterPermission(inviterId, tenantId);
    if (!hasPermission) {
      return NextResponse.json(
        {
          message:
            "Você não tem permissão para convidar usuários para esta loja.",
        },
        {status: 403}
      );
    }

    // 2. Encontrar o usuário que está sendo convidado pelo e-mail
    const invitee = await User.findOne({email: email.toLowerCase()}).lean();
    if (!invitee) {
      return NextResponse.json(
        {
          message: `Usuário com o e-mail '${email}' não encontrado. Peça para que ele crie uma conta primeiro.`,
        },
        {status: 404}
      );
    }

    // 3. Verificar se o usuário convidado é o próprio dono (não pode se auto-convidar)
    if (invitee._id.toString() === inviterId) {
      return NextResponse.json(
        {message: "Você não pode convidar a si mesmo."},
        {status: 400}
      );
    }

    // 4. Verificar se já existe um membership para este usuário nesta loja
    const existingMembership = await Membership.findOne({
      user: invitee._id,
      tenant: tenantId,
    }).lean();
    if (existingMembership) {
      return NextResponse.json(
        {message: `O usuário com e-mail '${email}' já é membro desta loja.`},
        {status: 409}
      ); // 409 Conflict
    }

    // 5. Criar a nova associação (membership)
    const newMembership = new Membership({
      user: invitee._id,
      tenant: tenantId,
      role: role, // 'admin' ou 'staff'
      status: "active", // Por enquanto, ativamos diretamente. Poderia ser 'pending' se houvesse um fluxo de e-mail.
      invitedBy: inviterId,
    });

    await newMembership.save();

    return NextResponse.json(
      {message: "Usuário convidado e adicionado à loja com sucesso!"},
      {status: 201}
    );
  } catch (error: any) {
    console.error("Erro ao processar convite:", error);
    return NextResponse.json(
      {message: "Erro interno do servidor ao processar o convite."},
      {status: 500}
    );
  }
}
