"use client";

import React, { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  VisibilityState,
  ColumnFiltersState, // Para filtros por coluna (opcional)
  // getFacetedRowModel, // Para contagem de valores únicos (opcional)
  // getFacetedUniqueValues, // Para contagem de valores únicos (opcional)
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MixerHorizontalIcon } from "@radix-ui/react-icons";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Funções opcionais para manipulação externa (ex: refresh)
  onRowAction?: (action: string, rowData: TData) => void; // Para futuras ações
}

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  // Estados da Tabela
  const [sorting, setSorting] = useState<SortingState>([]); // Estado de ordenação
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]); // Estado de filtros por coluna (se usar)
  const [globalFilter, setGlobalFilter] = useState(""); // Estado de filtro global
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({}); // Estado de visibilidade das colunas
  const [rowSelection, setRowSelection] = useState({}); // Estado de seleção de linhas (se usar checkboxes)

  // Hook principal do React Table
  const table = useReactTable({
    data,
    columns,
    // Configuração dos estados
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      globalFilter,
    },
    // Manipuladores de mudança de estado
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    // Modelos de dados (essenciais)
    getCoreRowModel: getCoreRowModel(), // Modelo base de linhas
    getPaginationRowModel: getPaginationRowModel(), // Modelo para paginação
    getSortedRowModel: getSortedRowModel(), // Modelo para ordenação
    getFilteredRowModel: getFilteredRowModel(), // Modelo para filtros (global e por coluna)
    // Modelos opcionais para filtros avançados
    // getFacetedRowModel: getFacetedRowModel(),
    // getFacetedUniqueValues: getFacetedUniqueValues(),
    // Habilitar filtro global (se necessário)
    // enableGlobalFilter: true, // Ou definir a função getGlobalFilteredRowModel
    // globalFilterFn: 'includesString', // Ou uma função customizada
    // Paginação inicial (pode ser controlada externamente também)
    initialState: {
      pagination: {
        pageSize: 10, // Quantidade de itens por página padrão
      },
    },
  });

  // Função auxiliar para obter um nome legível para a coluna no menu de visibilidade
  const getColumnHeaderName = (columnId: string): string => {
    const column = table.getColumn(columnId);
    // Tenta obter do meta.title definido nas colunas
    const metaTitle = column?.columnDef.meta?.title;
    if (metaTitle) {
      return metaTitle;
    }
    // Fallback: formata o ID da coluna (camelCase, snake_case para Title Case)
    return columnId
      .replace(/([a-z])([A-Z])/g, "$1 $2") // Separa camelCase
      .replace(/[._-]/g, " ") // Substitui delimitadores por espaço
      .replace(/\b\w/g, (l) => l.toUpperCase()); // Capitaliza cada palavra
  };

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas da Tabela (Filtros, Visibilidade, etc.) */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        {/* Filtro Global */}
        <Input
          placeholder="Filtrar tudo..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-full sm:max-w-sm h-9" // Ajuste de tamanho
        />
        {/* Botão de Visibilidade de Colunas */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9">
              <MixerHorizontalIcon className="mr-2 h-4 w-4" />
              Colunas
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Exibir/Ocultar Colunas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter(
                (column) =>
                  typeof column.accessorFn !== "undefined" &&
                  column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {getColumnHeaderName(column.id)}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabela Principal */}
      <div className="rounded-md border">
        {/* Definir min-width aqui ou no container pai se necessário para scroll horizontal */}
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nenhum resultado encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rodapé da Tabela (Paginação) */}
      <div className="flex items-center justify-between space-x-2 py-4">
        {/* Informação de Seleção (opcional) */}
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} de{" "}
          {table.getFilteredRowModel().rows.length} linha(s) selecionada(s).
        </div>
        {/* Controles de Paginação */}
        <div className="flex items-center space-x-2">
          {/* Selecionar tamanho da página */}
          <span className="text-sm">Itens por página:</span>
          <select
            value={table.getState().pagination.pageSize}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            className="p-1 border rounded text-sm"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>

          <span className="text-sm">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          {/* Botões de Navegação */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
}
