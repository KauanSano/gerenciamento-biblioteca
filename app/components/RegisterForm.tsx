// components/RegisterForm.tsx (Exemplo)
"use client";
import React, {useState} from "react";
import {useRouter} from "next/navigation";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({email, password, name}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Erro ${response.status}`);
      }

      toast.success("Registro realizado com sucesso!", {
        description: "Você já pode fazer login.",
      });
      // Redirecionar para a página de login ou mostrar mensagem
      router.push("/login"); // << AJUSTE A ROTA se necessário
    } catch (err: any) {
      console.error("Erro no registro:", err);
      setError(err.message || "Ocorreu um erro durante o registro.");
      toast.error("Falha no Registro", {
        description: err.message || "Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name-register">Nome (Opcional)</Label>
        <Input
          id="name-register"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="email-register">Email*</Label>
        <Input
          id="email-register"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="password-register">Senha*</Label>
        <Input
          id="password-register"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {/* Adicionar validação de força de senha aqui */}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isLoading}>
        {isLoading ? "Registrando..." : "Registrar"}
      </Button>
    </form>
  );
}
