// types/next-auth.d.ts

import NextAuth, {DefaultSession, DefaultUser} from "next-auth";
import {JWT, DefaultJWT} from "next-auth/jwt";

declare module "next-auth" {
  // Estende a interface Session padrão
  interface Session {
    user: {
      id: string; // ID do MongoDB como string
      activeTenantId?: string | null;
      activeTenantName?: string | null;
      currentRole?: string | null;
      // Mantém os campos padrão (name, email, image) usando DefaultSession
    } & DefaultSession["user"];
  }

  // Estende a interface User padrão (retornada por authorize e usada no primeiro login do JWT)
  // Adicione aqui quaisquer campos extras que você retorna da função 'authorize'
  // interface User extends DefaultUser {
  //     // exemplo: role?: string;
  // }
}

declare module "next-auth/jwt" {
  // Estende a interface JWT padrão
  interface JWT extends DefaultJWT {
    userId?: string;
    activeTenantId?: string | null;
    activeTenantName?: string | null;
    currentRole?: string | null;
    // Adicione outros campos que você armazena no token
  }
}
