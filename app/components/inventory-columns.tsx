// components/inventory-columns.tsx (NOVO ARQUIVO - EXEMPLO)
"use client";

import {ColumnDef} from "@tanstack/react-table";
import {MoreHorizontal, Edit, Trash, Copy} from "lucide-react";
import {toast} from "sonner";
import Image from "next/image"; // Para exibir capa

import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {DataTableColumnHeader} from "./DataTableColumnHeader"; // Reutiliza o header

// Importa a interface do NOVO modelo e tipos relacionados
import {
  IInventoryItem,
  CondicaoLivro,
  AcabamentoLivro,
  IdiomaLivro,
} from "@/lib/models/inventoryItem.model"; // << AJUSTE O CAMINHO

// --- Funções Auxiliares de Formatação (Podem ser movidas para utils) ---
const formatCurrency = (value: number | undefined | null): string => {
  const numberValue = Number(value);
  return isNaN(numberValue)
    ? " - "
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(numberValue);
};

const conditionLabels: Record<CondicaoLivro, string> = {
  novo: "Novo",
  usado: "Usado",
};
const bindingLabels: Record<AcabamentoLivro, string> = {
  brochura: "Brochura",
  "capa dura": "Capa Dura",
  espiral: "Espiral",
  outro: "Outro",
};
const languageLabels: Record<IdiomaLivro, string> = {
  português: "Português",
  inglês: "Inglês",
  espanhol: "Espanhol",
  outro: "Outro",
};

// --- Definição das Colunas para InventoryItem ---
interface InventoryColumnsProps {
  refetchData?: () => void;
  onEdit?: (item: IInventoryItem) => void;
  // Talvez props para buscar BookMetadata se não vier populado?
}

export const getInventoryColumns = ({
  refetchData,
  onEdit,
}: InventoryColumnsProps = {}): ColumnDef<IInventoryItem>[] => [
  // Coluna de Ações (similar, mas agora opera em /api/inventory/[itemId])
  {
    id: "actions",
    header: () => <div className="text-right">Ações</div>,
    cell: ({row}) => {
      const item = row.original; // Agora é um InventoryItem

      const handleDelete = async () => {
        if (!item._id) return;
        if (
          !confirm(
            `Tem certeza que deseja excluir o item com SKU "${item.sku}"?`
          )
        )
          return;

        const toastId = toast.loading(`Excluindo item SKU ${item.sku}...`);
        try {
          // *** CHAMA A NOVA API DE INVENTÁRIO ***
          const response = await fetch(`/api/inventory/${item._id}`, {
            method: "DELETE",
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.message || `Erro ${response.status}`);

          toast.success("Item excluído!", {id: toastId});
          refetchData?.(); // Atualiza a tabela
        } catch (error: any) {
          console.error("Erro ao excluir item:", error);
          toast.error("Erro na exclusão", {
            id: toastId,
            description: error.message,
          });
        }
      };

      const handleEdit = () => {
        onEdit?.(item); // Chama callback de edição passando o IInventoryItem
      };

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Opções</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" /> Editar Item
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(item.sku);
                  toast.success("SKU Copiado!");
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar SKU
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-700 focus:bg-red-50"
              >
                <Trash className="mr-2 h-4 w-4" /> Excluir Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },

  // Coluna SKU (Identificador principal do item)
  {
    accessorKey: "sku",
    header: ({column}) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({row}) => <div className="font-medium">{row.getValue("sku")}</div>,
    meta: {title: "SKU"},
  },

  // Coluna Título (Exemplo: Assumindo que veio populado do BookMetadata)
  {
    // Se a API não popular, este accessorKey não funcionará diretamente
    // Você precisaria buscar ou usar um accessorFn complexo
    accessorKey: "bookMetadata.title", // Acessa o campo aninhado
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Título" />
    ),
    cell: ({row}) => {
      // @ts-ignore // Temporário se bookMetadata não estiver tipado como populado
      const title = row.original.bookMetadata?.title || "Título não disponível";
      return (
        <span title={title} className="truncate block max-w-xs">
          {title}
        </span>
      ); // Evita quebra de layout
    },
    meta: {title: "Título"},
  },
  // Coluna Autor (Exemplo: Assumindo que veio populado)
  {
    accessorKey: "bookMetadata.authors",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Autor(es)" />
    ),
    cell: ({row}) => {
      // @ts-ignore
      const authors = row.original.bookMetadata?.authors;
      const displayAuthors = Array.isArray(authors)
        ? authors.join(", ")
        : "N/D";
      return (
        <span title={displayAuthors} className="truncate block max-w-xs">
          {displayAuthors}
        </span>
      );
    },
    enableSorting: false,
    meta: {title: "Autor(es)"},
  },

  // Coluna Condição
  {
    accessorKey: "condition",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Condição" />
    ),
    cell: ({row}) => {
      const condition = row.getValue("condition") as CondicaoLivro;
      return conditionLabels[condition] || condition;
    },
    meta: {title: "Condição"},
  },

  // Coluna Preço Venda
  {
    id: "price.sale", // ID único
    accessorFn: row => row.price?.sale, // Função para acessar o valor
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Preço (R$)" />
    ),
    cell: ({row}) => formatCurrency(row.original.price?.sale),
    meta: {title: "Preço Venda"},
  },

  // Coluna Estoque (Total Próprio/Consignado)
  {
    id: "stock",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Estoque (P/C)" />
    ),
    accessorFn: row => (row.stock?.own || 0) + (row.stock?.consigned || 0), // Ordena pelo total
    cell: ({row}) => {
      const own = row.original.stock?.own ?? 0; // Usa ?? para tratar null/undefined
      const consigned = row.original.stock?.consigned ?? 0;
      return <div className="text-center">{`${own}/${consigned}`}</div>;
    },
    meta: {title: "Estoque (Próprio/Consignado)"},
  },

  // Outras colunas relevantes do InventoryItem (Label, Binding, Language, etc.)
  {
    accessorKey: "label",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Localização" />
    ),
    meta: {title: "Localização"},
  },
  {
    accessorKey: "binding",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Acabamento" />
    ),
    cell: ({row}) => {
      const binding = row.getValue("binding") as AcabamentoLivro;
      return bindingLabels[binding] || binding;
    },
    meta: {title: "Acabamento"},
  },
  // ... Adicione mais colunas conforme necessário ...
];
