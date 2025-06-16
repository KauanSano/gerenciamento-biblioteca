// components/book-columns.tsx
"use client";

import Image from "next/image";
import {ColumnDef} from "@tanstack/react-table";
import {MoreHorizontal, Edit, Trash, Copy, ExternalLink} from "lucide-react";
import {toast} from "sonner";

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

import {
  IBook,
  CondicaoLivro,
  AcabamentoLivro,
  IdiomaLivro,
} from "../../lib/models/bookSchema";

// --- Funções Auxiliares de Formatação ---

// Formata número para moeda BRL
const formatCurrency = (value: number | undefined | null): string => {
  const numberValue = Number(value);
  return isNaN(numberValue)
    ? " - " // Ou "R$ 0,00" se preferir
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

// --- Definição das Colunas ---

// Propriedade opcional para passar a função de atualização de dados
// Isso é útil para que as ações (delete, edit) possam atualizar a tabela
interface BookColumnsProps {
  refetchData?: () => void; // Função para recarregar os dados
  onEdit?: (book: IBook) => void;
}

// Gera as colunas, opcionalmente recebendo callbacks
export const getBookColumns = ({
  refetchData,
  onEdit,
}: BookColumnsProps = {}): ColumnDef<IBook>[] => [
  // --- Coluna de Seleção ---
  /*
    {
        id: "select",
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Selecionar todas as linhas"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Selecionar linha"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    },
    */

  // --- Coluna de Ações ---
  {
    id: "actions",
    header: () => <div className="text-right">Ações</div>, // Centralizar ou alinhar
    cell: ({row}) => {
      const book = row.original; // book é do tipo IBook

      const handleDelete = async () => {
        if (!book._id) return;
        // Confirmação antes de excluir (RECOMENDADO)
        if (
          !confirm(
            `Tem certeza que deseja excluir o livro "${book.title}"? Esta ação não pode ser desfeita.`
          )
        ) {
          return;
        }

        const toastId = toast.loading(`Excluindo "${book.title}"...`); // Feedback de carregamento
        try {
          const response = await fetch(`/api/books/${book._id}`, {
            // Use _id
            method: "DELETE",
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.message || `Erro ${response.status}`);
          }

          toast.success("Livro excluído!", {
            id: toastId,
            description: `"${book.title}" foi removido do sistema.`,
          });
          refetchData?.(); // Chama a função para atualizar a tabela, se fornecida
        } catch (error: any) {
          console.error("Erro ao excluir:", error);
          toast.error("Erro na exclusão", {
            id: toastId,
            description: error.message || "Não foi possível excluir o livro.",
          });
        }
      };

      // Função para chamar o callback de edição
      const handleEdit = () => {
        if (onEdit) {
          onEdit(book); // Passa o livro inteiro para a função de edição
        } else {
          // Fallback se onEdit não for fornecido
          console.log("Editar livro ID:", book._id);
          toast.info("Ação de Editar", {
            description: "Configure o manipulador 'onEdit' na página.",
          });
        }
      };

      return (
        <div className="text-right">
          {" "}
          {/* Garante alinhamento */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Opções</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  navigator.clipboard.writeText(book._id.toString());
                  toast.success("ID copiado!", {
                    description:
                      "ID do banco de dados copiado para a área de transferência.",
                  });
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar ID (DB)
              </DropdownMenuItem>
              {/* Link externo para a capa (se houver) */}
              {book.cover_image && (
                <DropdownMenuItem asChild>
                  <a
                    href={book.cover_image}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Capa
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-red-600 focus:text-red-700 focus:bg-red-50" // Estilo para ação destrutiva
              >
                <Trash className="mr-2 h-4 w-4" />
                Excluir Livro
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false, // Ações geralmente não devem ser escondidas
  },

  // --- Colunas de Dados do Livro ---
  {
    accessorKey: "cover_image",
    header: "Capa",
    cell: ({row}) => {
      const imageUrl = row.getValue("cover_image") as string | undefined;
      const title = row.original.title;
      return imageUrl ? (
        <Image
          src={imageUrl}
          alt={`Capa de ${title}`}
          width={40} // Tamanho menor para a célula
          height={60}
          className="rounded object-cover" // object-cover para manter proporção
          loader={({src}) => src} // Loader simples para URLs externas
          unoptimized // Necessário para URLs externas sem config no next.config.js
          onError={e => {
            e.currentTarget.style.display = "none";
          }} // Oculta se imagem falhar
        />
      ) : (
        <div className="w-[40px] h-[60px] bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
          Sem Imagem
        </div>
      );
    },
    enableSorting: false,
    meta: {title: "Capa"},
  },
  {
    accessorKey: "title",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Título" />
    ),
    cell: ({row}) => <div className="font-medium">{row.getValue("title")}</div>,
    meta: {title: "Título"},
  },
  {
    accessorKey: "author",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Autor" />
    ),
    meta: {title: "Autor"},
  },
  {
    accessorKey: "isbn",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="ISBN" />
    ),
    meta: {title: "ISBN"},
  },
  {
    accessorKey: "sku",
    header: ({column}) => <DataTableColumnHeader column={column} title="SKU" />,
    meta: {title: "SKU"},
  },
  {
    accessorKey: "condition",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Condição" />
    ),
    cell: ({row}) => {
      const condition = row.getValue("condition") as CondicaoLivro;
      return conditionLabels[condition] || condition;
    },
    filterFn: "equals", // Para filtros exatos (dropdown, select)
    meta: {title: "Condição"},
  },
  {
    // Coluna combinada para estoque
    id: "stock",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Estoque (T/P/C)" /> // Total / Próprio / Consignado
    ),
    accessorFn: row => (row.stock?.own || 0) + (row.stock?.consigned || 0), // Ordena pelo total
    cell: ({row}) => {
      const own = row.original.stock?.own || 0;
      const consigned = row.original.stock?.consigned || 0;
      const total = own + consigned;
      // Poderia usar badges ou cores aqui
      return (
        <div className="text-center">{`${total} (${own}/${consigned})`}</div>
      );
    },
    meta: {title: "Estoque (Total/Próprio/Consignado)"},
  },
  {
    // Coluna combinada para preço
    id: "price",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Preço (Venda/Custo)" />
    ),
    accessorFn: row => row.price?.sale || 0, // Ordena pelo preço de venda
    cell: ({row}) => (
      <div>
        <div>{formatCurrency(row.original.price?.sale)}</div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(row.original.price?.cost)}
        </div>
      </div>
    ),
    meta: {title: "Preço (Venda/Custo)"},
  },
  {
    accessorKey: "publisher",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Editora" />
    ),
    enableHiding: true, // Pode ser útil ocultar
    meta: {title: "Editora"},
  },
  {
    accessorKey: "year",
    header: ({column}) => <DataTableColumnHeader column={column} title="Ano" />,
    enableHiding: true,
    meta: {title: "Ano"},
  },
  {
    accessorKey: "category",
    header: "Categorias",
    cell: ({row}) => {
      const categories = row.getValue("category") as string[] | undefined;
      return categories && categories.length > 0 ? (
        categories.join(", ")
      ) : (
        <span className="text-muted-foreground">N/D</span>
      );
    },
    enableSorting: false,
    enableHiding: true,
    meta: {title: "Categorias"},
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
    filterFn: "equals",
    enableHiding: true,
    meta: {title: "Acabamento"},
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
    filterFn: "equals",
    enableHiding: true,
    meta: {title: "Idioma"},
  },
  {
    accessorKey: "pageCount",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Páginas" />
    ),
    cell: ({row}) =>
      row.getValue("pageCount") || (
        <span className="text-muted-foreground">N/D</span>
      ),
    enableHiding: true,
    meta: {title: "Nº Páginas"},
  },
  {
    accessorKey: "weight",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Peso (g)" />
    ),
    cell: ({row}) =>
      row.getValue("weight") ? (
        `${row.getValue("weight")}g`
      ) : (
        <span className="text-muted-foreground">N/D</span>
      ),
    enableHiding: true,
    meta: {title: "Peso (g)"},
  },
  {
    accessorKey: "label",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Etiqueta" />
    ),
    cell: ({row}) =>
      row.getValue("label") || (
        <span className="text-muted-foreground">N/D</span>
      ),
    enableHiding: true,
    meta: {title: "Etiqueta Interna"},
  },
  {
    accessorKey: "isResale",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Revenda?" />
    ),
    cell: ({row}) => (row.getValue("isResale") ? "Sim" : "Não"),
    filterFn: "equals",
    enableHiding: true,
    meta: {title: "É Revenda"},
  },
  // Poderia adicionar colunas para createdAt, updatedAt
  {
    accessorKey: "updatedAt",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Última Modificação" />
    ),
    cell: ({row}) =>
      new Date(row.getValue("updatedAt")).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    enableHiding: true,
    meta: {title: "Modificado em"},
  },
  {
    // Oculta por padrão, mas permite copiar
    accessorKey: "_id",
    header: "",
    cell: () => null, // Não mostra na célula
    enableSorting: false,
    enableHiding: false, // Não pode ocultar para a ação de copiar funcionar
    meta: {title: "ID Banco de Dados"}, // Usado apenas internamente ou no menu de colunas
  },
];
