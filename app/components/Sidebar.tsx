// components/Sidebar.tsx
"use client";

import React, {useState, useEffect} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useSession, signOut} from "next-auth/react"; // signOut para botão de logout
import {Button} from "@/components/ui/button";
import {Loader2, CheckCircle} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  PanelLeft,
  Store,
  BookCopy,
  Users,
  Settings,
  LogOut,
  PlusCircle,
  ChevronDown,
  ChevronsLeftRight,
  Home,
  LineChart,
} from "lucide-react"; // Ícones
import {toast} from "sonner";
import {CreateTenantForm} from "./CreateTenantForm"; // Para o modal de criar novo tenant
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Interface para os dados de tenant que virão da API
interface UserTenant {
  id: string;
  name: string;
  role: string; // 'owner', 'admin', 'staff'
}

export function Sidebar() {
  const {data: session, status, update} = useSession();
  const pathname = usePathname();
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isCreateTenantModalOpen, setIsCreateTenantModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false); // Para controle do Sheet em mobile

  const activeTenantId = (session?.user as any)?.activeTenantId;
  const activeTenantName =
    (session?.user as any)?.activeTenantName || "Nenhuma loja selecionada";
  const userName = session?.user?.name || session?.user?.email || "Usuário";
  const userEmail = session?.user?.email;

  // Busca os tenants do usuário quando a sessão estiver carregada
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchUserTenants();
    }
  }, [status, session?.user?.id]);

  const fetchUserTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const response = await fetch("/api/tenants"); // Chama a nova API GET
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao buscar lojas/sebos.");
      }
      const result = await response.json();
      setUserTenants(result.data || []);
    } catch (error: any) {
      console.error("Erro ao buscar tenants:", error);
      toast.error("Erro ao carregar lojas", {description: error.message});
      setUserTenants([]);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  // Função para selecionar um tenant
  const handleSelectTenant = async (tenant: UserTenant) => {
    if (activeTenantId === tenant.id) {
      toast.info(`Loja "${tenant.name}" já está selecionada.`);
      setIsSheetOpen(false); // Fecha o sheet se estiver aberto
      return;
    }

    toast.loading(`Selecionando loja "${tenant.name}"...`, {
      id: "select-tenant",
    });
    try {
      // Atualiza a sessão do Next-Auth com o novo tenantId, nome e papel
      await update({
        activeTenantId: tenant.id,
        activeTenantName: tenant.name,
        currentRole: tenant.role,
      });
      toast.success(`Loja "${tenant.name}" selecionada!`, {
        id: "select-tenant",
      });
      setIsSheetOpen(false); // Fecha o sheet se estiver aberto
      // Opcional: Redirecionar para o dashboard ou forçar refresh da página
      // window.location.reload(); // Ou router.refresh() se estiver usando Next 13+ App Router
    } catch (error) {
      console.error("Erro ao atualizar sessão com novo tenant:", error);
      toast.error("Erro ao selecionar loja", {
        id: "select-tenant",
        description: "Tente novamente.",
      });
    }
  };

  // Função chamada após um novo tenant ser criado
  const handleTenantCreated = (newTenant: UserTenant) => {
    setIsCreateTenantModalOpen(false); // Fecha o modal de criação
    fetchUserTenants(); // Atualiza a lista de tenants
    // Automaticamente seleciona o tenant recém-criado
    if (newTenant && newTenant.id && newTenant.name) {
      handleSelectTenant(newTenant);
    }
  };

  if (status === "loading") {
    return (
      <aside className="w-64 p-4 border-r bg-muted/40 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </aside>
    );
  }
  if (status === "unauthenticated") {
    return null; // Ou um placeholder, mas o middleware deve ter redirecionado
  }

  const navItems = [
    {href: "/dashboard", label: "Início", icon: Home},
    {href: "/dashboard/inventory", label: "Inventário", icon: BookCopy},
    {href: "/dashboard/reports", label: "Relatórios", icon: LineChart},
    {href: "/dashboard/users", label: "Usuários da Loja", icon: Users},
    {href: "/dashboard/settings", label: "Configurações", icon: Settings},
  ];

  const sidebarContent = (
    <>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Store className="h-6 w-6" />
            <span>Minha Biblioteca App</span>
          </Link>
          {/* Botão para fechar o Sheet em mobile, não visível em desktop */}
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between h-auto py-2 px-3 text-left mb-2"
                >
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">
                      Loja Ativa
                    </span>
                    <span
                      className="font-semibold truncate"
                      title={activeTenantName}
                    >
                      {activeTenantName || "Selecione uma loja"}
                    </span>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Suas Lojas/Sebos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isLoadingTenants ? (
                  <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
                ) : userTenants.length > 0 ? (
                  userTenants.map(tenant => (
                    <DropdownMenuItem
                      key={tenant.id}
                      onClick={() => handleSelectTenant(tenant)}
                      disabled={activeTenantId === tenant.id}
                      className={
                        activeTenantId === tenant.id ? "bg-accent" : ""
                      }
                    >
                      {tenant.name}{" "}
                      {activeTenantId === tenant.id && (
                        <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                      )}{" "}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>Nenhuma loja.</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsCreateTenantModalOpen(true);
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Criar Nova Loja
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {navItems.map(item => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsSheetOpen(false)} // Fecha o sheet ao navegar
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                  pathname === item.href
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {/* Rodapé da Sidebar com informações do usuário e Logout */}
        <div className="mt-auto p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-3 text-left"
              >
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage
                    src={session?.user?.image || undefined}
                    alt={userName}
                  />
                  <AvatarFallback>
                    {userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col truncate">
                  <span
                    className="text-sm font-medium truncate"
                    title={userName}
                  >
                    {userName}
                  </span>
                  <span
                    className="text-xs text-muted-foreground truncate"
                    title={userEmail}
                  >
                    {userEmail}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="start" side="top">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Perfil</DropdownMenuItem>
              <DropdownMenuItem>Assinatura</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({callbackUrl: "/login"})}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Modal para Criar Novo Tenant (controlado por isCreateTenantModalOpen) */}
      <Dialog
        open={isCreateTenantModalOpen}
        onOpenChange={setIsCreateTenantModalOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Nova Loja/Sebo</DialogTitle>
          </DialogHeader>
          <CreateTenantForm onTenantCreated={handleTenantCreated} />
          <DialogFooter>
            {/* Este DialogClose está correto, pois está dentro do <Dialog> pai */}
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Fechar
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar para Desktop */}
      <aside className="hidden lg:block w-64 bg-muted/40 border-r">
        {sidebarContent}
      </aside>

      {/* Botão e Sheet para Mobile */}
      <div className="lg:hidden p-2 fixed top-0 left-0 z-50">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <PanelLeft className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            {" "}
            {/* Adicionado flex flex-col */}
            {/* O sidebarContent agora é renderizado aqui dentro */}
            {/* E o SheetClose que estava no sidebarContent precisa estar aqui também */}
            <div className="flex h-14 items-center border-b px-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold"
                onClick={() => setIsSheetOpen(false)}
              >
                <Store className="h-6 w-6" />
                <span>Meu Sebo App</span>
              </Link>
              <SheetClose asChild className="ml-auto">
                <Button variant="outline" size="icon">
                  <ChevronsLeftRight className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
            {/* O restante do sidebarContent (scrollável) */}
            <div className="flex-1 overflow-y-auto">
              {/* Recriamos a estrutura da nav aqui ou passamos o sidebarContent filtrado */}
              {/* Por simplicidade, vamos apenas renderizar o sidebarContent e saber que o header dele será duplicado visualmente */}
              {/* Uma refatoração melhor seria separar o header do sidebarContent */}
              {React.cloneElement(sidebarContent, {key: "sheet-content"})}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
