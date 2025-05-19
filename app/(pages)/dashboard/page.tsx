// app/dashboard/page.tsx
"use client";

import React, {useState, useEffect, useCallback, useMemo} from "react";
import {DataTable} from "../../components/DataTable";
import {getInventoryColumns} from "../../components/inventory-columns";
import {IInventoryItem} from "@/lib/models/inventoryItem.model";
import {toast} from "sonner";
import {PaginationState, SortingState} from "@tanstack/react-table";

// Hook customizado para debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

export default function DashboardPage() {
  const [data, setData] = useState<IInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [pageCount, setPageCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // --- NOVO: Estados para Filtro Global ---
  const [globalFilterInput, setGlobalFilterInput] = useState(""); // O que o usuário digita
  const debouncedGlobalFilter = useDebounce(globalFilterInput, 500); // Valor "debounced" para API
  // --- FIM Filtro Global ---

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    console.log(
      `Buscando inventário: Página ${pagination.pageIndex + 1}, Limite ${
        pagination.pageSize
      }, Filtro: "${debouncedGlobalFilter}"`
    );

    const queryParams = new URLSearchParams({
      page: (pagination.pageIndex + 1).toString(),
      limit: pagination.pageSize.toString(),
    });
    // Adiciona o filtro global se existir
    if (debouncedGlobalFilter) {
      queryParams.append("search", debouncedGlobalFilter);
    }
    // Adicionar ordenação aqui se implementado

    try {
      const response = await fetch(`/api/inventory?${queryParams.toString()}`);
      if (!response.ok) {
        /* ... tratamento de erro ... */ throw new Error(
          `HTTP error! status: ${response.status}`
        );
      }
      const result = await response.json();
      setData(result.data || []);
      setPageCount(result.pagination?.totalPages || 0);
      setTotalItems(result.pagination?.totalItems || 0);
    } catch (error: any) {
      console.error("Falha ao buscar inventário:", error);
      toast.error("Erro ao carregar inventário", {description: error.message});
      setData([]);
      setPageCount(0);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.pageIndex, pagination.pageSize, debouncedGlobalFilter]); // Adiciona debouncedGlobalFilter como dependência

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditRequest = (item: IInventoryItem) => {
    /* ... */
  };

  const columns = useMemo(
    () =>
      getInventoryColumns({
        refetchData: fetchData,
        onEdit: handleEditRequest,
      }),
    [fetchData]
  );

  if (isLoading && data.length === 0) {
    /* ... loading ... */
  }

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Inventário</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {totalItems > 0
          ? `${totalItems} itens encontrados.`
          : "Nenhum item no inventário."}
      </p>

      <DataTable
        columns={columns}
        data={data}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        // --- NOVO: Passando props de filtro global ---
        globalFilter={globalFilterInput} // Passa o valor do input para a DataTable exibi-lo
        onGlobalFilterChange={setGlobalFilterInput} // Função para atualizar o estado do input
      />
    </>
  );
}
