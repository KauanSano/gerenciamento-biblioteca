// app/(pages)/dashboard/users/page.tsx
"use client";

import React, {useState, useEffect, useMemo, useCallback} from "react";
import {useSession} from "next-auth/react";
import {toast} from "sonner";
import {Loader2} from "lucide-react";
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
  ColumnFiltersState,
  PaginationState,
  Column,
} from "@tanstack/react-table";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Button} from "@/components/ui/button";
import {
  MoreHorizontal,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {MixerHorizontalIcon} from "@radix-ui/react-icons";
import {cn} from "@/lib/utils";

// --- START: DataTableColumnHeader Component ---
interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}
function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
          >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-muted-foreground/70" />
            Desc
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
// --- END: DataTableColumnHeader Component ---

// --- START: DataTable Component ---
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: (
    updater: PaginationState | ((old: PaginationState) => PaginationState)
  ) => void;
}

function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  pagination,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    pageCount: pageCount ?? -1,
    state: {pagination, columnVisibility},
    onPaginationChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined, // Only use if pagination is provided
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: !!pagination,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id} colSpan={h.colSpan}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map(cell => (
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
                  Nenhum resultado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
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
      )}
    </div>
  );
}
// --- END: DataTable Component ---

// --- START: UsersPage Logic ---
interface Member {
  _id: string;
  role: "owner" | "admin" | "staff";
  status: "active" | "pending";
  user: {
    _id: string;
    name: string;
    email: string;
    image?: string;
  };
  createdAt: string;
}

const getUsersColumns = (
  refetch: () => void,
  currentUserRole: string | null
): ColumnDef<Member>[] => [
  {
    accessorKey: "user.name",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Nome" />
    ),
    cell: ({row}) => {
      const member = row.original;
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={member.user.image} alt={member.user.name} />
            <AvatarFallback>{member.user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium">{member.user.name}</span>
            <span className="text-xs text-muted-foreground block">
              {member.user.email}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Papel" />
    ),
    cell: ({row}) => (
      <Badge variant={row.original.role === "owner" ? "default" : "secondary"}>
        {
          {owner: "Dono(a)", admin: "Admin", staff: "Funcionário(a)"}[
            row.original.role
          ]
        }
      </Badge>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({column}) => (
      <DataTableColumnHeader column={column} title="Membro Desde" />
    ),
    cell: ({row}) =>
      new Date(row.original.createdAt).toLocaleDateString("pt-BR"),
  },
  {
    id: "actions",
    cell: ({row}) => {
      const member = row.original;
      const canPerformActions = currentUserRole === "owner";
      const handleRemove = () =>
        toast.info(`Remover ${member.user.name}... (ainda não implementado)`);
      if (member.role === "owner" || !canPerformActions) return null;
      return (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleRemove} className="text-red-500">
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

export default function UsersPage() {
  const {data: session} = useSession();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const tenantId = (session?.user as any)?.activeTenantId;
  const currentUserRole = (session?.user as any)?.currentRole;

  const fetchMembers = useCallback(async () => {
    if (!tenantId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/members`);
      if (!response.ok) throw new Error("Falha ao buscar membros da loja.");
      const result = await response.json();
      setMembers(result.data);
    } catch (error: any) {
      toast.error("Erro", {description: error.message});
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const columns = useMemo(
    () => getUsersColumns(fetchMembers, currentUserRole),
    [fetchMembers, currentUserRole]
  );

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Usuários da Loja</h1>
      <p className="text-muted-foreground">
        Gerencie os membros e as permissões da sua loja.
      </p>
      {/* A DataTable na página de usuários não precisa de paginação por enquanto */}
      <DataTable columns={columns} data={members} />
    </div>
  );
}
