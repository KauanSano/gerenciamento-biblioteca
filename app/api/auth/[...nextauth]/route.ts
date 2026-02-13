import NextAuth, {NextAuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/db/dbConnect";
import User, {IUser} from "@/lib/models/user.model";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {label: "Email", type: "email"},
        password: {label: "Senha", type: "password"},
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error("Email e senha são obrigatórios.");
        }

        await dbConnect();

        const user = await User.findOne<IUser>({
          email: credentials.email.toLowerCase(),
        }).select("+password");

        if (!user) {
          throw new Error("Usuário não encontrado.");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isPasswordValid) {
          throw new Error("Senha incorreta.");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          cnpj: user.cnpj,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({token, user, trigger, session}) {
      // Executado no login inicial
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.cnpj = user.cnpj;
      }

      // Se houver update da sessão no cliente
      if (trigger === "update" && session) {
        token = {...token, ...session};
      }

      return token;
    },
    async session({session, token}) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.cnpj = token.cnpj as string | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    newUser: "/select-profile", // Redireciona novos usuários para seleção de perfil
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export {handler as GET, handler as POST};
