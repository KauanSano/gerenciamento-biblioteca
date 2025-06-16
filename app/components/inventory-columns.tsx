// app/components/inventory-columns.tsx
"use client";

import {ColumnDef} from "@tanstack/react-table";
import {
  MoreHorizontal,
  Edit,
  Trash,
  Copy,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";
import {toast} from "sonner";
import Image from "next/image";

import {Button} from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {DataTableColumnHeader} from "@/app/components/DataTableColumnHeader";
import {Badge} from "@/components/ui/badge";
import {
  IInventoryItem,
  CondicaoLivro,
  AcabamentoLivro,
  IdiomaLivro,
} from "@/lib/models/inventoryItem.model";

// Funções Auxiliares de Formatação
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
const statusLabels: Record<IInventoryItem["status"], string> = {
  available: "Disponível",
  reserved: "Reservado",
  sold: "Vendido",
  delisted: "Deslistado",
};
const statusColors: Record<IInventoryItem["status"], string> = {
  available: "bg-green-100 text-green-800 border-green-300",
  reserved: "bg-yellow-100 text-yellow-800 border-yellow-300",
  sold: "bg-red-100 text-red-800 border-red-300",
  delisted: "bg-gray-100 text-gray-800 border-gray-300",
};

interface InventoryColumnsProps {
  refetchData?: () => void;
  onEdit?: (item: IInventoryItem) => void;
}

export const getInventoryColumns = ({
  refetchData,
  onEdit,
}: InventoryColumnsProps = {}): ColumnDef<IInventoryItem>[] => [
  {
    id: "actions",
    header: () => <div className="text-right">Ações</div>,
    cell: ({row}) => {
      const item = row.original;

      const handleDelete = async () => {
        if (!item._id) return;
        if (
          !confirm(
            `Tem certeza que deseja excluir o item com SKU "${item.sku}"?`
          )
        ) {
          return;
        }
        const toastId = toast.loading(`Excluindo item SKU ${item.sku}...`);
        try {
          const response = await fetch(`/api/inventory/${item._id}`, {
            method: "DELETE",
          });
          const result = await response.json();
          if (!response.ok)
            throw new Error(result.message || `Erro ${response.status}`);
          toast.success("Item excluído!", {id: toastId});
          refetchData?.();
        } catch (error: any) {
          toast.error("Erro na exclusão", {
            id: toastId,
            description: error.message,
          });
        }
      };

      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Opções do Item</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit?.(item)}>
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
              {item.coverImageUrl && (
                <DropdownMenuItem asChild>
                  <a
                    href={item.coverImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> Ver Capa
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-700 focus:bg-red-100"
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
  {
    accessorKey: "coverImageUrl",
    header: "Capa",
    cell: ({row}) => {
      const imageUrl = row.getValue("coverImageUrl") as string | undefined;
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt={`Capa de ${row.original.title}`}
          width={40}
          height={60}
          className="rounded object-cover border"
          onError={e => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
          unoptimized={imageUrl.startsWith("http")}
        />
      ) : (
        <div className="w-[40px] h-[60px] bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "sku",
    header: ({column}) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({row}) => (
      <div className="font-medium text-xs">{row.getValue("sku")}</div>
    ),
  },
  {
    accessorKey: "title",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Título" />
    ),
    cell: ({row}) => (
      <span
        title={row.getValue("title")}
        className="font-medium block max-w-xs truncate"
      >
        {row.getValue("title")}
      </span>
    ),
  },
  {
    accessorKey: "authors",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Autor(es)" />
    ),
    cell: ({row}) => (
      <span className="block max-w-[200px] truncate">
        {((row.getValue("authors") as string[]) || []).join(", ") || "N/D"}
      </span>
    ),
  },
  {
    accessorKey: "isbn",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="ISBN" />
    ),
    cell: ({row}) => (
      <div className="text-xs">{row.getValue("isbn") || "N/D"}</div>
    ),
  },
  {
    accessorKey: "condition",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Condição" />
    ),
    cell: ({row}) =>
      conditionLabels[row.getValue("condition") as CondicaoLivro] ||
      row.getValue("condition"),
  },
  {
    id: "price.sale",
    accessorFn: row => row.price?.sale,
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Preço (R$)" />
    ),
    cell: ({row}) => formatCurrency(row.original.price?.sale),
  },
  {
    id: "stock",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Estoque" />
    ),
    accessorFn: row => row.stock?.own || 0,
    cell: ({row}) => (
      <div className="text-center">{`${row.original.stock?.own ?? 0}`}</div>
    ),
  },
  {
    accessorKey: "status",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({row}) => (
      <Badge
        variant="outline"
        className={`text-xs ${
          statusColors[row.getValue("status") as IInventoryItem["status"]] || ""
        }`}
      >
        {statusLabels[row.getValue("status") as IInventoryItem["status"]] ||
          row.getValue("status")}
      </Badge>
    ),
  },
];
