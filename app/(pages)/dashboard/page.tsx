// app/dashboard/page.tsx
"use client";

import React, {useState, useEffect, useCallback} from "react";
import {DataTable} from "../../components/DataTable"; // Ajuste o caminho
// *** Importa as NOVAS colunas e a interface ***
import {getInventoryColumns} from "../../components/inventory-columns"; // << NOVO
import {IInventoryItem} from "@/lib/models/inventoryItem.model"; // << NOVO (Ajuste o caminho!)
import {toast} from "sonner";
//import {TopMenu} from "../../components/TopMenu";

// Não precisamos mais do ExcelUpload aqui
// import { ExcelUpload } from "../../components/ExcelUpload";

// Não precisamos mais de IBook aqui
// import { IBook } from "../../../lib/models/bookSchema";

export default function DashboardPage() {
  // *** Usa a NOVA interface ***
  const [data, setData] = useState<IInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Estado para editar (agora recebe IInventoryItem)
  // const [editingItem, setEditingItem] = useState<IInventoryItem | null>(null);

  // *** Atualizar para buscar dados do INVENTÁRIO ***
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    console.log("Buscando dados do inventário..."); // Log para indicar chamada
    try {
      // *** CHAMA A NOVA API DE INVENTÁRIO (precisa ser criada na Fase 3) ***
      // Exemplo: const response = await fetch("/api/inventory");
      // Por enquanto, vamos simular uma resposta vazia ou mockada:
      await new Promise(resolve => setTimeout(resolve, 300)); // Simula delay
      const mockApiResponse = {data: []}; // Simula API retornando array vazio
      // const mockApiResponse = { data: [{_id: '123', sku: 'ABC', title:'Livro Mock', price: {sale: 10}, stock: {own: 1}}] }; // Exemplo com dados

      // if (!response.ok) { // Tratamento de erro da API real
      //     const errorData = await response.json().catch(() => ({ message: `Erro ${response.status}`}));
      //     throw new Error(errorData.message || `Erro ${response.status}`);
      // }
      // const result = await response.json();
      const result = mockApiResponse; // Usando mock por enquanto
      setData(result.data || []);
    } catch (error: any) {
      console.error("Falha ao buscar inventário:", error);
      toast.error("Erro ao carregar inventário", {description: error.message});
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Função para lidar com a edição (recebe IInventoryItem)
  const handleEditRequest = (item: IInventoryItem) => {
    // << Alterado para IInventoryItem
    console.log("Solicitação para editar o item:", item);
    // setEditingItem(item); // Abre modal/página de edição para o item
    toast.info(`Editar item SKU: ${item.sku}`, {
      description: "Implementar lógica de edição.",
    });
  };

  // *** Gera as NOVAS colunas ***
  const columns = getInventoryColumns({
    refetchData: fetchData, // Passa a função para recarregar após delete/edit
    onEdit: handleEditRequest, // Passa a função para lidar com clique em editar
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 text-center">
        Carregando inventário...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Renderiza o menu e passa o callback */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">
          Inventário {/* Título da página */}
        </h1>

        {/* O ExcelUpload foi removido daqui, agora está no modal do TopMenu */}

        <DataTable columns={columns} data={data} />

        {/* Lógica para Modal de Edição (se usar modal) */}
        {/* {editingItem && (
                     <EditInventoryItemModal
                         itemData={editingItem}
                         onClose={() => setEditingItem(null)}
                         onSaveSuccess={() => {
                             setEditingItem(null);
                             fetchData(); // Atualiza tabela
                         }}
                     />
                 )} */}
      </main>
    </div>
  );
}
