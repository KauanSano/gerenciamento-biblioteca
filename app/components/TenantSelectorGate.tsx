// components/TenantSelectorGate.tsx (Exemplo)
"use client";

import React from "react";
import {useSession} from "next-auth/react";
import {CreateTenantForm} from "./CreateTenantForm"; // Importa o form de criação
import {Loader2} from "lucide-react"; // Ícone de loading

interface TenantSelectorGateProps {
  children: React.ReactNode; // O conteúdo a ser mostrado se houver tenant ativo
}

export function TenantSelectorGate({children}: TenantSelectorGateProps) {
  const {data: session, status, update} = useSession();

  // Função para ser chamada após o tenant ser criado pelo formulário
  const handleTenantCreated = () => {
    // Força a atualização da sessão para pegar o novo activeTenantId definido nos callbacks
    update();
  };

  // 1. Estado de Carregamento da Sessão
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2">Carregando sessão...</span>
      </div>
    );
  }

  // 2. Usuário não autenticado (embora o middleware deva pegar antes)
  if (status === "unauthenticated") {
    // Pode redirecionar para login ou mostrar mensagem
    // Idealmente o middleware já redirecionou, mas como fallback:
    return <p>Você precisa fazer login.</p>;
  }

  // 3. Autenticado, mas SEM Tenant Ativo na Sessão
  // Acessa o campo customizado (pode precisar de 'as any' ou tipagem global)
  const activeTenantId = (session?.user as any)?.activeTenantId;

  if (!activeTenantId) {
    return (
      <div className="container mx-auto py-10 px-4 mt-10">
        {/* Mostra o formulário para criar o primeiro tenant */}
        <CreateTenantForm onTenantCreated={handleTenantCreated} />
        {/* Poderia adicionar uma lista de tenants existentes para seleção aqui no futuro */}
      </div>
    );
  }

  // 4. Autenticado E COM Tenant Ativo: Renderiza o conteúdo protegido
  return <>{children}</>;
}
