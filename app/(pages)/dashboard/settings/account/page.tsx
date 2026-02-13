"use client";

import {useState, useEffect} from "react";
import {useSession} from "next-auth/react";
import {toast} from "sonner";
import {
  User,
  Building2,
  Mail,
  Shield,
  Plus,
  Trash2,
  Lock,
  Edit2,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface Profile {
  _id: string;
  name: string;
  role: "admin" | "member";
  avatar: string;
  pin?: string;
}

export default function AccountSettingsPage() {
  const {data: session} = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);

  // Dados do formulário de novo perfil
  const [isAddProfileOpen, setIsAddProfileOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfilePin, setNewProfilePin] = useState("");

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setIsLoadingProfiles(true);
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (error) {
      toast.error("Erro ao carregar perfis");
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      toast.error("O nome do perfil é obrigatório");
      return;
    }

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          name: newProfileName,
          pin: newProfilePin,
          role: "member", // Padrão
        }),
      });

      if (res.ok) {
        toast.success("Perfil criado com sucesso!");
        setIsAddProfileOpen(false);
        setNewProfileName("");
        setNewProfilePin("");
        fetchProfiles();
      } else {
        const data = await res.json();
        toast.error(data.error || "Erro ao criar perfil");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este perfil?")) return;

    try {
      // Implementar rota de DELETE na API de profiles se necessário
      // const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      toast.info("Funcionalidade de exclusão a ser implementada na API");
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Dados Principais da Conta */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da Conta</CardTitle>
          <CardDescription>
            Informações principais do titular da assinatura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome do Titular</Label>
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/50">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{session?.user?.name}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-mail de Acesso</Label>
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/50">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{session?.user?.email}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {/* Precisaria pegar o CNPJ da sessão se estiver disponível, ou buscar da API */}
                <span>{session?.user?.cnpj || "Não informado"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Plano Atual</Label>
              <div className="flex items-center gap-2">
                <Badge
                  variant="default"
                  className="bg-primary hover:bg-primary"
                >
                  Premium
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button variant="outline" size="sm">
            Editar Informações
          </Button>
        </CardFooter>
      </Card>

      {/* 2. Gerenciamento de Perfis */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>Perfis de Acesso</CardTitle>
            <CardDescription>
              Gerencie quem acessa sua biblioteca
            </CardDescription>
          </div>
          <Dialog open={isAddProfileOpen} onOpenChange={setIsAddProfileOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> Adicionar Perfil
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Perfil</DialogTitle>
                <DialogDescription>
                  Crie um perfil para um funcionário ou membro.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Perfil</Label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>PIN de Acesso (Opcional)</Label>
                  <Input
                    placeholder="4 dígitos"
                    maxLength={4}
                    value={newProfilePin}
                    onChange={e =>
                      setNewProfilePin(e.target.value.replace(/\D/g, ""))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Útil para restringir acesso a este perfil.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateProfile}>Criar Perfil</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoadingProfiles ? (
            <div className="text-center py-4">Carregando perfis...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
              {profiles.map(profile => (
                <div
                  key={profile._id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}`}
                      />
                      <AvatarFallback>{profile.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                      <div className="font-medium flex items-center gap-2">
                        {profile.name}
                        {profile.role === "admin" && (
                          <Shield className="h-3 w-3 text-primary" />
                        )}
                        {profile.pin && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {profile.role === "admin" ? "Administrador" : "Membro"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {profile.role !== "admin" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteProfile(profile._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
