// app/dashboard/layout.tsx
import React from "react";
import {TopMenu} from "../../components/TopMenu";
import {TenantSelectorGate} from "../../components/TenantSelectorGate"; // Importa o Gate

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen">
      <TopMenu />{" "}
      <main className="flex-1 overflow-y-auto">
        {/* Envolve o conteúdo com o Gate */}
        <TenantSelectorGate>
          {/* Só renderiza o conteúdo da página se houver tenant ativo */}
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </TenantSelectorGate>
      </main>
    </div>
  );
}
