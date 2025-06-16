// app/(pages)/dashboard/page.tsx
"use client";

import React, {useState, useEffect, useCallback, useMemo} from "react";
import {PaginationState} from "@tanstack/react-table";
import {toast} from "sonner";

import {DataTable} from "@/app/components/DataTable"; // Ajuste se necessário
import {getInventoryColumns} from "@/app/components/inventory-columns";
import {IInventoryItem} from "@/lib/models/inventoryItem.model";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {EditInventoryItemForm} from "@/app/components/EditInventoryItemForm";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
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
  const [globalFilterInput, setGlobalFilterInput] = useState("");
  const debouncedGlobalFilter = useDebounce(globalFilterInput, 500);
  const [editingItem, setEditingItem] = useState<IInventoryItem | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const queryParams = new URLSearchParams({
      page: (pagination.pageIndex + 1).toString(),
      limit: pagination.pageSize.toString(),
      search: debouncedGlobalFilter,
    });
    try {
      const response = await fetch(`/api/inventory?${queryParams.toString()}`);
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setData(result.data || []);
      setPageCount(result.pagination?.totalPages || 0);
      setTotalItems(result.pagination?.totalItems || 0);
    } catch (error: any) {
      toast.error("Erro ao carregar inventário", {description: error.message});
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [pagination, debouncedGlobalFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditRequest = (item: IInventoryItem) => setEditingItem(item);
  const handleModalClose = () => setEditingItem(null);
  const handleEditSuccess = () => {
    setEditingItem(null);
    fetchData();
  };

  const columns = useMemo(
    () =>
      getInventoryColumns({refetchData: fetchData, onEdit: handleEditRequest}),
    [fetchData]
  );

  return (
    <>
      <Dialog
        open={!!editingItem}
        onOpenChange={isOpen => !isOpen && handleModalClose()}
      >
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Item do Inventário</DialogTitle>
            <DialogDescription>
              Modifique os detalhes do item com SKU: {editingItem?.sku}
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <EditInventoryItemForm
              itemToEdit={editingItem}
              onSuccess={handleEditSuccess}
              onCancel={handleModalClose}
            />
          )}
        </DialogContent>
      </Dialog>
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Inventário</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {isLoading && data.length === 0
          ? "Carregando..."
          : totalItems > 0
          ? `${totalItems} itens encontrados.`
          : "Nenhum item no inventário."}
      </p>
      <DataTable
        columns={columns}
        data={data}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        globalFilter={globalFilterInput}
        onGlobalFilterChange={setGlobalFilterInput}
      />
    </>
  );
}
