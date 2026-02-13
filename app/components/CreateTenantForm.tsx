"use client";

import React, {useState} from "react";
import {useSession} from "next-auth/react"; // Para forçar atualização da sessão
import {useRouter} from "next/navigation"; // Para redirecionamento
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
  const {update} = useSession(); // Hook para ATUALIZAR a sessão
  const router = useRouter(); // Hook para NAVEGAÇÃO

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

      // !!! ALTERAÇÃO IMPORTANTE: Atualiza a sessão DIRETAMENTE com os novos dados !!!
      // Isso é mais rápido do que um update() vazio, pois já fornece os dados
      // e garante que a próxima página carregada já terá o tenant ativo correto.
      await update({
        activeTenantId: result.data._id,
        activeTenantName: result.data.name,
        currentRole: "owner", // O criador é sempre o 'owner'
      });

      setName(""); // Limpa o campo do formulário
      onTenantCreated?.(result.data); // Chama o callback do pai (para fechar o modal)

      // Redireciona para o dashboard após a sessão ser atualizada
      router.push("/dashboard");
      // router.refresh() também pode ser útil aqui para forçar a recarga de dados
      // em Server Components na página de destino.
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
          placeholder="Ex: Livraria Brasil..."
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
