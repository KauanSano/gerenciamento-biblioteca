"use client";

import {useState} from "react";
import {signIn} from "next-auth/react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {toast} from "sonner";
import {Eye, EyeOff, Lock, Mail, Loader2} from "lucide-react"; // Ícones necessários

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast.error("Erro ao entrar", {
          description: "Verifique suas credenciais e tente novamente.",
        });
      } else {
        toast.success("Bem-vindo de volta!");
        router.push("/dashboard");
        router.refresh();
      }
    } catch (error) {
      toast.error("Erro inesperado", {
        description: "Ocorreu um erro ao tentar fazer login.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
      <CardHeader className="space-y-1 pb-2 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
          Bem-vindo de volta
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Insira suas credenciais para acessar sua conta
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="sr-only">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                className="pl-10 h-12 bg-input/50 border-input focus:border-primary transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="sr-only">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                className="pl-10 pr-10 h-12 bg-input/50 border-input focus:border-primary transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(157,78,221,0.6)] transition-all duration-300"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </Button>

          <div className="flex flex-col items-center gap-4 text-sm mt-4">
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              Esqueceu sua senha?
            </Link>

            <div className="text-muted-foreground">
              Não tem conta?{" "}
              <Link
                href="/signup"
                className="text-primary font-semibold hover:text-primary/80 transition-colors"
              >
                Cadastre-se
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
