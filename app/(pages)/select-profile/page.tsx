"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Plus, Lock} from "lucide-react";
import {toast} from "sonner";
import {useSession} from "next-auth/react";

import {Card} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";

interface Profile {
  _id: string;
  name: string;
  role: "admin" | "member";
  avatar: string;
  pin?: string;
}

export default function SelectProfilePage() {
  const router = useRouter();
  const {data: session, status} = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState("");

  // Estado para criar novo perfil
  const [newProfileOpen, setNewProfileOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchProfiles();
    }
  }, [status, router]);

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (error) {
      toast.error("Erro ao carregar perfis");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (profile: Profile) => {
    if (profile.pin) {
      setSelectedProfile(profile);
      setPinDialogOpen(true);
      setPinInput("");
    } else {
      activateProfile(profile);
    }
  };

  const verifyPin = () => {
    if (selectedProfile && selectedProfile.pin === pinInput) {
      setPinDialogOpen(false);
      activateProfile(selectedProfile);
    } else {
      toast.error("PIN incorreto");
      setPinInput("");
    }
  };

  const activateProfile = (profile: Profile) => {
    localStorage.setItem("activeProfileId", profile._id);
    localStorage.setItem("activeProfileRole", profile.role);

    toast.success(`Bem-vindo, ${profile.name}!`);
    router.push("/dashboard");
  };

  const handleCreateProfile = async () => {
    if (!newName) return;

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name: newName, pin: newPin, role: "member"}),
      });

      if (res.ok) {
        toast.success("Perfil criado!");
        setNewProfileOpen(false);
        setNewName("");
        setNewPin("");
        fetchProfiles();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    }
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando...
      </div>
    );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8 animate-in fade-in duration-500">
      <h1 className="mb-12 text-4xl font-bold tracking-tight text-foreground text-center">
        Quem está gerenciando?
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-8">
        {profiles.map(profile => (
          <div
            key={profile._id}
            onClick={() => handleProfileClick(profile)}
            className="group flex flex-col items-center gap-4 cursor-pointer"
          >
            <div className="relative h-32 w-32 overflow-hidden rounded-md border-2 border-transparent transition-all duration-300 group-hover:scale-105 group-hover:border-primary">
              <Avatar className="h-full w-full rounded-none">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.name}&backgroundColor=1d1626&textColor=9d4edd`}
                />
                <AvatarFallback className="rounded-none bg-card text-4xl uppercase">
                  {profile.name[0]}
                </AvatarFallback>
              </Avatar>
              {profile.pin && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Lock className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
            <span className="text-xl text-muted-foreground transition-colors group-hover:text-foreground">
              {profile.name}
            </span>
          </div>
        ))}

        {/* Botão Adicionar Perfil */}
        <Dialog open={newProfileOpen} onOpenChange={setNewProfileOpen}>
          <DialogTrigger asChild>
            <div className="group flex flex-col items-center gap-4 cursor-pointer">
              <div className="flex h-32 w-32 items-center justify-center rounded-md border-2 border-dashed border-muted transition-all duration-300 group-hover:border-foreground group-hover:bg-accent/10">
                <Plus className="h-12 w-12 text-muted-foreground group-hover:text-foreground" />
              </div>
              <span className="text-xl text-muted-foreground transition-colors group-hover:text-foreground">
                Adicionar
              </span>
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Perfil</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Nome do perfil"
                />
              </div>
              <div className="space-y-2">
                <Label>PIN (Opcional - 4 números)</Label>
                <Input
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="0000"
                  maxLength={4}
                  type="password"
                  inputMode="numeric"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateProfile}>Criar Perfil</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal de PIN */}
      <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
        <DialogContent className="sm:max-w-xs text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Digite o PIN</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <Input
              type="password"
              maxLength={4}
              className="w-32 text-center text-2xl tracking-[0.5em]"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && verifyPin()}
              autoFocus
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={verifyPin} className="w-full">
              Acessar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
