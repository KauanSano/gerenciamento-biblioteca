// components/CreateTenantForm.tsx
"use client";

import React, {useState} from "react";
import {useSession} from "next-auth/react"; // Para forçar atualização da sessão
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {toast} from "sonner";
import {Loader2} from "lucide-react";

// Prop opcional para ser chamada após criação bem-sucedida
interface CreateTenantFormProps {
  onTenantCreated?: (tenantData: any) => void;
}

export function CreateTenantForm({onTenantCreated}: CreateTenantFormProps) {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {update} = useSession(); // Hook para atualizar a sessão

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tenants", {
        // Chama a API POST
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Erro ${response.status}`);
      }

      toast.success(`Loja "${result.data.name}" criada com sucesso!`);

      // !!! IMPORTANTE: Atualiza a sessão no cliente !!!
      // Isso força o Next-Auth a buscar os novos dados nos callbacks (incluindo o novo tenantId)
      await update(); // Você pode passar os novos dados aqui se quiser: update({ activeTenantId: result.data._id, ...})

      setName(""); // Limpa o formulário
      onTenantCreated?.(result.data); // Chama o callback do pai, se houver
    } catch (err: any) {
      console.error("Erro ao criar tenant:", err);
      setError(err.message || "Não foi possível criar a loja.");
      toast.error("Falha ao criar loja", {description: err.message});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
      <h2 className="text-xl font-semibold text-center">
        Crie sua Primeira Loja/Sebo
      </h2>
      <p className="text-sm text-center text-muted-foreground">
        Dê um nome para o seu espaço de gerenciamento.
      </p>
      <div>
        <Label htmlFor="tenant-name">Nome da Loja/Sebo*</Label>
        <Input
          id="tenant-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Ex: Sebo do Zé"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isLoading ? "Criando..." : "Criar Loja"}
      </Button>
    </form>
  );
}
