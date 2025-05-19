// components/inventory-columns.tsx
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
import {DataTableColumnHeader} from "./DataTableColumnHeader";
import {Badge} from "@/components/ui/badge";
import {
  IInventoryItem,
  CondicaoLivro,
  AcabamentoLivro,
  IdiomaLivro,
} from "@/lib/models/inventoryItem.model";

// --- Funções Auxiliares de Formatação ---
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

// Mapeamento para status do item (exemplo)
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

// --- Props para a função que gera as colunas ---
interface InventoryColumnsProps {
  refetchData?: () => void; // Função para recarregar os dados da tabela
  onEdit?: (item: IInventoryItem) => void; // Função para iniciar a edição
}

// --- Definição das Colunas para InventoryItem ---
export const getInventoryColumns = ({
  refetchData,
  onEdit,
}: InventoryColumnsProps = {}): ColumnDef<IInventoryItem>[] => [
  // Coluna de Ações
  {
    id: "actions",
    header: () => <div className="text-right">Ações</div>,
    cell: ({row}) => {
      const item = row.original; // item é do tipo IInventoryItem

      const handleDelete = async () => {
        if (!item._id) return;
        if (
          !confirm(
            `Tem certeza que deseja excluir o item com SKU "${item.sku}" (Título: ${item.title})? Esta ação não pode ser desfeita.`
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
          toast.success("Item excluído!", {
            id: toastId,
            description: `SKU ${item.sku} removido.`,
          });
          refetchData?.();
        } catch (error: any) {
          console.error("Erro ao excluir item:", error);
          toast.error("Erro na exclusão", {
            id: toastId,
            description: error.message,
          });
        }
      };

      const handleEdit = () => {
        onEdit?.(item);
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
              {item.isbn && (
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(item.isbn!);
                    toast.success("ISBN Copiado!");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> Copiar ISBN
                </DropdownMenuItem>
              )}
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

  // Coluna Imagem da Capa
  {
    accessorKey: "coverImageUrl",
    header: "Capa",
    cell: ({row}) => {
      const imageUrl = row.getValue("coverImageUrl") as string | undefined;
      const title = row.original.title || "Capa";
      return imageUrl ? (
        <Image
          src={
            imageUrl.startsWith("http")
              ? imageUrl
              : `${process.env.NEXT_PUBLIC_BASE_URL || ""}${imageUrl}`
          } // Garante URL absoluta para imagens locais
          alt={`Capa de ${title}`}
          width={40}
          height={60}
          className="rounded object-cover border" // Adiciona borda
          onError={e => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
          unoptimized={imageUrl.startsWith("http")} // Não otimiza imagens externas
        />
      ) : (
        <div className="w-[40px] h-[60px] bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
          <ImageIcon className="h-5 w-5" />
        </div>
      );
    },
    enableSorting: false,
    meta: {title: "Capa"},
  },

  // Coluna SKU
  {
    accessorKey: "sku",
    header: ({column}) => <DataTableColumnHeader column={column} title="SKU" />,
    cell: ({row}) => (
      <div className="font-medium text-xs">{row.getValue("sku")}</div>
    ),
    meta: {title: "SKU"},
  },

  // Coluna Título
  {
    accessorKey: "title",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Título" />
    ),
    cell: ({row}) => {
      const title = (row.getValue("title") as string) || "N/D";
      return (
        <span title={title} className="font-medium block max-w-xs truncate">
          {title}
        </span>
      );
    },
    meta: {title: "Título"},
  },

  // Coluna Autor(es)
  {
    accessorKey: "authors",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Autor(es)" />
    ),
    cell: ({row}) => {
      const authors = row.getValue("authors") as string[] | undefined;
      const displayAuthors =
        Array.isArray(authors) && authors.length > 0
          ? authors.join(", ")
          : "N/D";
      return (
        <span title={displayAuthors} className="block max-w-[200px] truncate">
          {displayAuthors}
        </span>
      );
    },
    enableSorting: false,
    meta: {title: "Autor(es)"},
  },

  // Coluna ISBN
  {
    accessorKey: "isbn",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="ISBN" />
    ),
    cell: ({row}) => (
      <div className="text-xs">{row.getValue("isbn") || "N/D"}</div>
    ),
    meta: {title: "ISBN"},
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
    filterFn: "equals", // Bom para filtros de select
  },

  // Coluna Preço Venda
  {
    id: "price.sale",
    accessorFn: row => row.price?.sale,
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Preço (R$)" />
    ),
    cell: ({row}) => formatCurrency(row.original.price?.sale),
    meta: {title: "Preço Venda"},
  },

  // Coluna Estoque (Próprio / Consignado)
  {
    id: "stock",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Estoque (P/C)" />
    ),
    accessorFn: row => (row.stock?.own || 0) + (row.stock?.consigned || 0), // Ordena pelo total
    cell: ({row}) => {
      const own = row.original.stock?.own ?? 0;
      const consigned = row.original.stock?.consigned ?? 0;
      return <div className="text-center">{`${own} / ${consigned}`}</div>;
    },
    meta: {title: "Estoque (Próprio/Consignado)"},
  },

  // Coluna Status do Item
  {
    accessorKey: "status",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Status" />
    ),
    cell: ({row}) => {
      const status = row.getValue("status") as IInventoryItem["status"];
      return (
        <Badge
          variant="outline"
          className={`text-xs ${statusColors[status] || ""}`}
        >
          {statusLabels[status] || status}
        </Badge>
      );
    },
    meta: {title: "Status"},
    filterFn: "equals",
  },

  // Colunas opcionais (podem ser ocultadas por padrão)
  {
    accessorKey: "publisher",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Editora" />
    ),
    cell: ({row}) => (
      <div className="text-xs truncate max-w-[150px]">
        {row.getValue("publisher") || "N/D"}
      </div>
    ),
    meta: {title: "Editora"},
    enableHiding: true,
  },
  {
    accessorKey: "year",
    header: ({column}) => <DataTableColumnHeader column={column} title="Ano" />,
    cell: ({row}) => row.getValue("year") || "N/D",
    meta: {title: "Ano"},
    enableHiding: true,
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
    enableHiding: true,
  },
  {
    accessorKey: "language",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Idioma" />
    ),
    cell: ({row}) => {
      const language = row.getValue("language") as IdiomaLivro;
      return languageLabels[language] || language;
    },
    meta: {title: "Idioma"},
    enableHiding: true,
  },
  {
    accessorKey: "label",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Localização" />
    ),
    cell: ({row}) => row.getValue("label") || "N/D",
    meta: {title: "Localização"},
    enableHiding: true,
  },
  {
    accessorKey: "createdAt",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Criado em" />
    ),
    cell: ({row}) => {
      const date = row.getValue("createdAt");
      return date
        ? new Date(date as string).toLocaleDateString("pt-BR")
        : "N/D";
    },
    meta: {title: "Criado em"},
    enableHiding: true,
  },
];
