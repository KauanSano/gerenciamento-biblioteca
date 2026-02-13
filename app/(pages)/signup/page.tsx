import RegisterForm from "@/app/components/RegisterForm";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: "Cadastro | Biblioteca",
  description: "Crie sua conta para gerenciar sua biblioteca",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Efeito de luz de fundo (Glow) idêntico ao Login para consistência */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md">
        <RegisterForm />
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} Sistema de Biblioteca. Todos os
          direitos reservados.
        </p>
      </div>
    </div>
  );
}
