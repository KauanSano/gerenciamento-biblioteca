// components/LoginForm.tsx (Exemplo)
"use client";
import React, {useState} from "react";
import {signIn} from "next-auth/react"; // Função do Next-Auth para iniciar login
import {useRouter} from "next/navigation"; // Para redirecionar após login
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        redirect: false, // Não redireciona automaticamente, tratamos o resultado
        email: email,
        password: password,
      });

      if (result?.error) {
        // Erro retornado pelo callback 'authorize' ou erro genérico
        console.error("Erro de login:", result.error);
        setError("Credenciais inválidas. Verifique seu e-mail e senha.");
        toast.error("Falha no Login", {description: "Credenciais inválidas."});
      } else if (result?.ok) {
        // Login bem-sucedido!
        toast.success("Login realizado com sucesso!");
        // Redireciona para o dashboard ou página principal
        router.push("/dashboard"); // << AJUSTE A ROTA se necessário
        router.refresh(); // Força atualização para pegar nova sessão no servidor/layout
      } else {
        // Outro tipo de erro inesperado
        setError("Ocorreu um erro inesperado durante o login.");
        toast.error("Erro", {description: "Tente novamente mais tarde."});
      }
    } catch (err) {
      console.error("Catch de erro no login:", err);
      setError("Ocorreu uma falha na comunicação. Tente novamente.");
      toast.error("Erro de Rede", {description: "Não foi possível conectar."});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email-login">Email</Label>
        <Input
          id="email-login"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password-login">Senha</Label>
        <Input
          id="password-login"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
