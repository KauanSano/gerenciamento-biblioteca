// app/api/auth/[...nextauth]/route.ts

import NextAuth, {
  NextAuthOptions,
  User as NextAuthUser,
  Session,
} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/db/dbConnect"; // << AJUSTE O CAMINHO para seu dbConnect
import {User, IUser} from "@/lib/models/user.model"; // << AJUSTE O CAMINHO para seu User model
// Importe outros modelos se precisar buscar dados relacionados no login/sessão
import {Membership} from "@/lib/models/membership.model"; // << AJUSTE O CAMINHO
import {Tenant} from "@/lib/models/tenant.model"; // << AJUSTE O CAMINHO

export const authOptions: NextAuthOptions = {
  // Configura estratégia de sessão (JWT é mais simples para adicionar dados customizados)
  session: {
    strategy: "jwt",
  },
  // Provedores de autenticação (começando com Email/Senha)
  providers: [
    CredentialsProvider({
      // O nome exibido no formulário de login (opcional)
      name: "Credentials",
      // Campos esperados no formulário de login
      credentials: {
        email: {label: "Email", type: "email", placeholder: "seu@email.com"},
        password: {label: "Senha", type: "password"},
      },
      // Função que valida as credenciais
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) {
          console.log("Credenciais faltando");
          return null; // Retorna null se faltar email ou senha
        }

        console.log("Tentando autorizar:", credentials.email); // Log
        await dbConnect();

        // 1. Encontra o usuário pelo email
        const user = await User.findOne<IUser>({
          email: credentials.email.toLowerCase(),
        }).lean(); // lean() para objeto JS

        if (!user) {
          console.log("Usuário não encontrado:", credentials.email);
          // Você pode lançar um erro ou retornar null. Retornar null é mais comum.
          // throw new Error("Usuário não encontrado.");
          return null;
        }

        // 2. Compara a senha fornecida com o hash armazenado
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          console.log("Senha inválida para:", credentials.email);
          // throw new Error("Senha incorreta.");
          return null;
        }

        console.log("Autorizado com sucesso:", credentials.email);
        // 3. Retorna o objeto do usuário (SEM a senha) se tudo estiver OK
        // Next-Auth espera que o campo ID seja chamado 'id'. Mapeamos _id para id.
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          // Você pode adicionar outros campos aqui se precisar deles imediatamente
        };
      },
    }),
    // Você pode adicionar outros provedores aqui depois (Google, GitHub, etc.)
    // GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
  ],
  // Callbacks para customizar o fluxo
  callbacks: {
    // Chamado após login/atualização para criar/atualizar o token JWT
    async jwt({token, user, trigger, session}) {
      // 'user' só está presente no PRIMEIRO login com credenciais/oauth
      if (user) {
        console.log("Callback JWT: Usuário logando/registrando", user.id);
        token.userId = user.id; // Adiciona o ID do usuário MongoDB ao token
        token.email = user.email;
        token.name = user.name;

        // --- Lógica para buscar e adicionar Tenant Padrão/Ativo ---
        // Esta é uma lógica inicial, pode precisar de ajustes
        try {
          await dbConnect();
          // Busca o primeiro membership ativo para este usuário
          const membership = await Membership.findOne({
            user: user.id,
            status: "active",
          })
            .sort({createdAt: 1})
            .populate<{tenant: Pick<typeof Tenant, "_id" | "name">}>({
              // Tipagem para populate
              path: "tenant",
              select: "_id name", // Pega só ID e nome do tenant
            })
            .lean();

          if (membership && membership.tenant) {
            console.log(
              `Callback JWT: Tenant ativo encontrado para ${user.id}: ${membership.tenant._id}`
            );
            token.activeTenantId = membership.tenant._id.toString();
            token.activeTenantName = membership.tenant.name;
            token.currentRole = membership.role; // Adiciona o papel do usuário NO tenant ativo
          } else {
            console.log(
              `Callback JWT: Nenhum tenant ativo encontrado para ${user.id}`
            );
            // O que fazer se não tiver tenant? Deixar undefined ou um valor padrão?
            token.activeTenantId = null;
            token.activeTenantName = null;
            token.currentRole = null;
          }
        } catch (error) {
          console.error("Callback JWT: Erro ao buscar tenant ativo:", error);
          token.activeTenantId = null;
          token.activeTenantName = null;
          token.currentRole = null;
        }
        // ---------------------------------------------------------
      }

      // Lógica para ATUALIZAR o token se a sessão for atualizada (ex: mudar tenant)
      if (trigger === "update" && session?.activeTenantId) {
        console.log(
          "Callback JWT: Atualizando token com novos dados da sessão",
          session
        );
        token.activeTenantId = session.activeTenantId;
        token.activeTenantName = session.activeTenantName;
        token.currentRole = session.currentRole;
        // Você buscaria o nome/role aqui se a sessão só enviasse o ID
      }

      return token; // Retorna o token (com dados adicionados)
    },
    // Chamado sempre que a sessão é acessada (no cliente ou servidor)
    async session({session, token}) {
      // Copia os dados customizados do TOKEN JWT para o objeto SESSION
      if (token && session.user) {
        console.log(
          "Callback Session: Atualizando sessão com dados do token",
          token.userId
        );
        // Tipagem: Estende a interface Session["user"]
        (session.user as any).id = token.userId as string;
        (session.user as any).activeTenantId = token.activeTenantId as
          | string
          | null;
        (session.user as any).activeTenantName = token.activeTenantName as
          | string
          | null;
        (session.user as any).currentRole = token.currentRole as string | null;
        // Mantenha email e name que já vêm por padrão se precisar
        session.user.name = token.name;
        session.user.email = token.email;
      }
      // console.log("Callback Session: Sessão final:", session);
      return session; // Retorna a sessão modificada
    },
  },
  // Páginas customizadas (opcional)
  // pages: {
  //     signIn: '/auth/login',
  //     // signOut: '/auth/logout',
  //     // error: '/auth/error', // Error code passed in query string as ?error=
  //     // verifyRequest: '/auth/verify-request', // (used for email/magic link verification)
  //     // newUser: '/auth/new-user' // New users will be directed here on first sign in (leave the property out to disable)
  // }
  // debug: process.env.NODE_ENV === 'development', // Ativa logs do Next-Auth em dev
};

// Exporta os handlers GET e POST
const handler = NextAuth(authOptions);
export {handler as GET, handler as POST};
