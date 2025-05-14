//lib/authUtils.ts

import {getServerSession} from "next-auth/next";
// Ajuste o caminho para suas opções de autenticação!
import {authOptions} from "@/app/api/auth/[...nextauth]/route";

interface SessionData {
  userId: string | null;
  tenantId: string | null;
  tenantName?: string | null; // Opcional: nome do tenant
  userRole?: string | null; // Opcional: papel do usuário no tenant
  // Adicione outros dados da sessão se precisar
}

export async function getUserSessionData(): Promise<SessionData | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null; // Não autenticado
  }

  // Acessa os campos customizados que definimos na interface e populamos nos callbacks
  const userData = session.user as any; // Usa 'as any' ou a interface estendida de next-auth.d.ts

  return {
    userId: userData.id,
    tenantId: userData.activeTenantId || null, // Retorna null se não houver tenant ativo
    tenantName: userData.activeTenantName || null,
    userRole: userData.currentRole || null,
  };
}
