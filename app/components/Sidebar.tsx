"use client";

import React, {useState, useEffect} from "react";
import Link from "next/link";
import {usePathname, useRouter} from "next/navigation";
import {useSession, signOut} from "next-auth/react";
import {
  Loader2,
  CheckCircle,
  CreditCard,
  History,
  Users as UsersIcon,
  UserCircle,
  PanelLeft,
  Store,
  BookCopy,
  Settings,
  LogOut,
  ChevronDown,
  Home,
  ArrowRightLeft,
} from "lucide-react";
import {Button} from "@/components/ui/button";
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
import {toast} from "sonner";

// Interfaces adaptadas para o modelo de Perfil
interface Profile {
  _id: string;
  name: string;
  role: "admin" | "member";
  avatar?: string;
  pin?: string;
}

export function Sidebar() {
  const {data: session, status} = useSession();
  const pathname = usePathname();
  const router = useRouter();

  // Estados
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Dados da Sessão (Conta Principal)
  const userName = session?.user?.name || "Usuário";
  const userEmail = session?.user?.email;

  // Carregar perfis e identificar o ativo
  useEffect(() => {
    if (status === "authenticated") {
      fetchProfiles();
    }
  }, [status]);

  const fetchProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const response = await fetch("/api/profiles");
      if (!response.ok) throw new Error("Falha ao buscar perfis.");
      const data = await response.json();
      setProfiles(data || []);

      // Identifica o perfil ativo salvo no localStorage
      const storedProfileId = localStorage.getItem("activeProfileId");
      if (storedProfileId && data.length > 0) {
        const current = data.find((p: Profile) => p._id === storedProfileId);
        if (current) setActiveProfile(current);
        else setActiveProfile(data[0]); // Fallback para o primeiro
      } else if (data.length > 0) {
        // Se não tiver nada selecionado, seleciona o primeiro (geralmente Admin)
        setActiveProfile(data[0]);
        localStorage.setItem("activeProfileId", data[0]._id);
        localStorage.setItem("activeProfileRole", data[0].role);
      }
    } catch (error: any) {
      console.error("Erro ao carregar perfis:", error);
      // toast.error("Erro ao carregar perfis"); // Silencioso para não spammar no login
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleSwitchProfile = (profile: Profile) => {
    if (activeProfile?._id === profile._id) return;

    // Se o perfil tiver PIN, mandamos para a tela de seleção para autenticar
    if (profile.pin) {
      toast.info("Este perfil exige PIN.");
      router.push("/select-profile");
      return;
    }

    // Troca direta se não tiver PIN
    toast.loading(`Trocando para ${profile.name}...`);
    localStorage.setItem("activeProfileId", profile._id);
    localStorage.setItem("activeProfileRole", profile.role);

    // Pequeno reload ou atualização de estado
    setActiveProfile(profile);
    toast.dismiss();
    toast.success(`Perfil ${profile.name} ativo!`);
    window.location.reload(); // Recarrega para garantir que permissões sejam aplicadas
  };

  const navItems = [
    {href: "/dashboard", label: "Início", icon: Home},
    {href: "/dashboard/inventory", label: "Inventário", icon: BookCopy},
    {href: "/dashboard/users", label: "Usuários", icon: UsersIcon}, // Apenas visualização de perfis/membros
    {href: "/dashboard/audit", label: "Auditoria", icon: History},
    {
      href: "/dashboard/settings/account",
      label: "Configurações",
      icon: Settings,
    },
    {href: "/dashboard/billing", label: "Assinatura", icon: CreditCard},
  ];

  const sidebarContent = (
    <div className="flex h-full max-h-screen flex-col gap-2 bg-muted/20">
      {/* Header do Sidebar */}
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold"
        >
          <Store className="h-6 w-6 text-primary" />
          <span>Gestor de Sebo</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
          {/* Seletor de Perfil (Estilo Netflix) */}
          <div className="mb-4 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-3 px-3 text-left border-dashed border-primary/20 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="h-8 w-8 border border-primary/20">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${activeProfile?.name || "User"}&backgroundColor=1d1626&textColor=9d4edd`}
                      />
                      <AvatarFallback>
                        {activeProfile?.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-xs text-muted-foreground">
                        Perfil Ativo
                      </span>
                      <span
                        className="font-semibold truncate text-foreground"
                        title={activeProfile?.name}
                      >
                        {activeProfile?.name || "Carregando..."}
                      </span>
                    </div>
                  </div>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60" align="start">
                <DropdownMenuLabel>Trocar Perfil</DropdownMenuLabel>
                <DropdownMenuGroup>
                  {profiles.map(profile => (
                    <DropdownMenuItem
                      key={profile._id}
                      onClick={() => handleSwitchProfile(profile)}
                      disabled={activeProfile?._id === profile._id}
                      className="cursor-pointer"
                    >
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage
                          src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
                        />
                        <AvatarFallback>{profile.name[0]}</AvatarFallback>
                      </Avatar>
                      {profile.name}
                      {activeProfile?._id === profile._id && (
                        <CheckCircle className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/select-profile")}
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Gerenciar Perfis
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Itens de Navegação */}
          {navItems.map(item => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setIsSheetOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary hover:bg-primary/10 ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Footer do Usuário (Conta Principal) */}
      <div className="mt-auto p-4 border-t bg-background/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto py-2 px-3 text-left hover:bg-primary/5"
            >
              <Avatar className="h-8 w-8 mr-2 ring-2 ring-border">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>
                  {userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col truncate">
                <span className="text-sm font-medium truncate text-foreground">
                  {userName}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" align="start" side="top">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings/account")}
            >
              <Settings className="mr-2 h-4 w-4" /> Configurações
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => signOut({callbackUrl: "/login"})}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair da Conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block border-r h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {sidebarContent}
      </aside>

      {/* Sidebar Mobile (Sheet) */}
      <div className="lg:hidden p-2 fixed top-2 left-2 z-40">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="bg-background/80 backdrop-blur-sm shadow-sm"
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
