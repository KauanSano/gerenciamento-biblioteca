import LoginForm from "@/app/components/LoginForm";
import {Metadata} from "next";

export const metadata: Metadata = {
  title: "Login | Biblioteca",
  description: "Acesse sua conta",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md">
        <LoginForm />
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} Sistema ZERØ. Todos os direitos
          reservados.
        </p>
      </div>
    </div>
  );
}
