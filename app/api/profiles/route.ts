import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import dbConnect from "@/lib/db/dbConnect";
import Profile from "@/lib/models/profile.model";
import User from "@/lib/models/user.model";
import {authOptions} from "../auth/[...nextauth]/route";

// LISTAR PERFIS DA CONTA
export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({error: "Não autorizado"}, {status: 401});
  }

  try {
    // Busca o usuário pelo email da sessão
    const user = await User.findOne({email: session.user.email});
    if (!user) {
      return NextResponse.json(
        {error: "Usuário não encontrado"},
        {status: 404},
      );
    }

    const profiles = await Profile.find({user: user._id}).sort({createdAt: 1});
    return NextResponse.json(profiles);
  } catch (error) {
    return NextResponse.json({error: "Erro ao buscar perfis"}, {status: 500});
  }
}

// CRIAR NOVO PERFIL
export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({error: "Não autorizado"}, {status: 401});
  }

  try {
    const {name, pin, role, avatar} = await req.json();
    const user = await User.findOne({email: session.user.email});

    if (!user) {
      return NextResponse.json(
        {error: "Usuário não encontrado"},
        {status: 404},
      );
    }

    // Limite de perfis (opcional, estilo Netflix que limita a 5)
    const count = await Profile.countDocuments({user: user._id});
    if (count >= 5) {
      return NextResponse.json(
        {error: "Limite de perfis atingido"},
        {status: 400},
      );
    }

    const newProfile = await Profile.create({
      user: user._id,
      name,
      pin,
      role: role || "member",
      avatar: avatar || "default",
    });

    return NextResponse.json(newProfile, {status: 201});
  } catch (error) {
    return NextResponse.json({error: "Erro ao criar perfil"}, {status: 500});
  }
}
