// app/components/Sidebar.tsx
"use client";

import React, {useState, useEffect} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {useSession, signOut} from "next-auth/react";
import {Button} from "@/components/ui/button";
import {
  Loader2,
  CheckCircle,
  UserPlus,
  CreditCard,
  History,
} from "lucide-react";
import {Sheet, SheetContent, SheetTrigger} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
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
  Home,
  LineChart,
} from "lucide-react";
import {toast} from "sonner";
import {CreateTenantForm} from "./CreateTenantForm";
import {InviteUserForm} from "./InviteUserForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface UserTenant {
  id: string;
  name: string;
  role: "owner" | "admin" | "staff";
}

export function Sidebar() {
  const {data: session, status, update} = useSession();
  const pathname = usePathname();
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isCreateTenantModalOpen, setIsCreateTenantModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const userData = session?.user as any;
  const activeTenantId = userData?.activeTenantId;
  const activeTenantName = userData?.activeTenantName || "Nenhuma loja";
  const userName = session?.user?.name || session?.user?.email || "Usuário";
  const userEmail = session?.user?.email;
  const isOwnerOfAnyTenant = userTenants.some(t => t.role === "owner");
  const currentUserRoleInActiveTenant =
    userTenants.find(t => t.id === activeTenantId)?.role || null;
  const canInviteUsers =
    currentUserRoleInActiveTenant === "owner" ||
    currentUserRoleInActiveTenant === "admin";

  useEffect(() => {
    if (status === "authenticated") {
      fetchUserTenants();
    }
  }, [status, session?.user?.id]);

  const fetchUserTenants = async () => {
    setIsLoadingTenants(true);
    try {
      const response = await fetch("/api/tenants");
      if (!response.ok) throw new Error("Falha ao buscar lojas.");
      const result = await response.json();
      setUserTenants(result.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar lojas", {description: error.message});
    } finally {
      setIsLoadingTenants(false);
    }
  };

  const handleSelectTenant = async (tenant: UserTenant) => {
    if (activeTenantId === tenant.id) return;
    toast.loading(`Selecionando "${tenant.name}"...`);
    try {
      await update({
        activeTenantId: tenant.id,
        activeTenantName: tenant.name,
        currentRole: tenant.role,
      });
      toast.success(`Loja "${tenant.name}" selecionada!`);
      setIsSheetOpen(false);
    } catch (error) {
      toast.error("Erro ao selecionar loja.");
    }
  };

  const handleTenantCreated = (newTenant: UserTenant) => {
    setIsCreateTenantModalOpen(false);
    fetchUserTenants();
    handleSelectTenant(newTenant);
  };

  const handleInviteSuccess = () => setIsInviteModalOpen(false);

  const navItems = [
    {href: "/dashboard", label: "Início", icon: Home},
    {href: "/dashboard/inventory", label: "Inventário", icon: BookCopy},
    {href: "/dashboard/users", label: "Usuários", icon: Users},
    {href: "/dashboard/audit", label: "Auditoria", icon: History}, // NOVO
    {
      href: "/dashboard/settings/account",
      label: "Configurações",
      icon: Settings,
    },
    {href: "/dashboard/billing", label: "Assinatura", icon: CreditCard},
  ];

  const sidebarContent = (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Store className="h-6 w-6" />
          <span>Gestor de Sebo</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between h-auto py-2 px-3 text-left mb-2"
              >
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs text-muted-foreground">
                    Loja Ativa
                  </span>
                  <span
                    className="font-semibold truncate"
                    title={activeTenantName}
                  >
                    {activeTenantName}
                  </span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuGroup>
                {userTenants.map(tenant => (
                  <DropdownMenuItem
                    key={tenant.id}
                    onClick={() => handleSelectTenant(tenant)}
                    disabled={activeTenantId === tenant.id}
                  >
                    {tenant.name}
                    {activeTenantId === tenant.id && (
                      <CheckCircle className="ml-auto h-4 w-4 text-green-500" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              {canInviteUsers && (
                <DropdownMenuItem onClick={() => setIsInviteModalOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" /> Convidar Usuário
                </DropdownMenuItem>
              )}
              {!isOwnerOfAnyTenant && !isLoadingTenants && (
                <DropdownMenuItem
                  onClick={() => setIsCreateTenantModalOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> Criar Nova Loja
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {navItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsSheetOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                pathname.startsWith(item.href)
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
      <div className="mt-auto p-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-2 px-3 text-left"
            >
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium truncate">{userName}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" align="start" side="top">
            <DropdownMenuItem onClick={() => signOut({callbackUrl: "/login"})}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        open={isCreateTenantModalOpen}
        onOpenChange={setIsCreateTenantModalOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Loja</DialogTitle>
          </DialogHeader>
          <CreateTenantForm onTenantCreated={handleTenantCreated} />
        </DialogContent>
      </Dialog>
      {/* CORREÇÃO DO BUG: O onOpenChange agora controla o estado, garantindo que o modal feche corretamente */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Usuário</DialogTitle>
            <DialogDescription>
              Adicione um novo membro para a loja "{activeTenantName}".
            </DialogDescription>
          </DialogHeader>
          <InviteUserForm
            onSuccess={handleInviteSuccess}
            tenantId={activeTenantId}
          />
        </DialogContent>
      </Dialog>
      <aside className="hidden lg:block border-r bg-muted/40">
        {sidebarContent}
      </aside>
      <div className="lg:hidden p-2 fixed top-2 left-2 z-50 bg-background/80 backdrop-blur-sm rounded-full border">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="flex-1">{sidebarContent}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
