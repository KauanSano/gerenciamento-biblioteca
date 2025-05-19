// app/dashboard/layout.tsx
import React from "react";
import {TopMenu} from "../../components/TopMenu";
import {TenantSelectorGate} from "../../components/TenantSelectorGate"; // Importa o Gate

import {Sidebar} from "@/app/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <Sidebar />
      <div className="flex flex-col">
        <TopMenu />{" "}
        <main className="flex-1 overflow-y-auto">
          {/* Envolve o conteúdo com o Gate */}
          <TenantSelectorGate>
            {/* Só renderiza o conteúdo da página se houver tenant ativo */}
            <div className="p-4 md:p-6 lg:p-8">{children}</div>
          </TenantSelectorGate>
        </main>
      </div>
    </div>
  );
}
