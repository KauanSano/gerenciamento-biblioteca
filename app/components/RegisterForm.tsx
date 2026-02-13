"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {toast} from "sonner";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Loader2,
  CheckCircle2,
  Building2,
} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Função simples para máscara de CNPJ
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove tudo o que não é dígito
    if (value.length > 14) value = value.slice(0, 14); // Limita a 14 dígitos

    // Aplica a máscara: 00.000.000/0000-00
    value = value.replace(/^(\d{2})(\d)/, "$1.$2");
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
    value = value.replace(/(\d{4})(\d)/, "$1-$2");

    setCnpj(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password !== confirmPassword) {
      toast.error("Senhas não coincidem", {
        description: "Por favor, verifique a confirmação da senha.",
      });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          cnpj, // Enviando o CNPJ
          email,
          password,
        }),
      });

      if (res.ok) {
        toast.success("Conta criada com sucesso!", {
          description: "Você já pode fazer login no sistema.",
          icon: <CheckCircle2 className="text-green-500" />,
        });
        router.push("/login");
      } else {
        const data = await res.json();
        toast.error("Erro ao criar conta", {
          description:
            data.error || "Ocorreu um erro inesperado. Tente novamente.",
        });
      }
    } catch (error) {
      toast.error("Erro de conexão", {
        description: "Não foi possível conectar ao servidor.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl">
      <CardHeader className="space-y-1 pb-2 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
          Criar Conta
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Preencha os dados abaixo para começar
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name" className="sr-only">
              Nome Completo
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="Nome Completo"
                className="pl-10 h-12 bg-input/50 border-input focus:border-primary transition-colors"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* CNPJ */}
          <div className="space-y-2">
            <Label htmlFor="cnpj" className="sr-only">
              CNPJ
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="cnpj"
                type="text"
                placeholder="CNPJ"
                className="pl-10 h-12 bg-input/50 border-input focus:border-primary transition-colors"
                value={cnpj}
                onChange={handleCnpjChange}
                required
                disabled={loading}
                maxLength={18} // Limita o tamanho do input com a máscara
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="sr-only">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="E-mail"
                className="pl-10 h-12 bg-input/50 border-input focus:border-primary transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password" className="sr-only">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                className="pl-10 pr-10 h-12 bg-input/50 border-input focus:border-primary transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirmar Senha */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="sr-only">
              Confirmar Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirmar Senha"
                className="pl-10 h-12 bg-input/50 border-input focus:border-primary transition-colors"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-lg font-medium bg-primary hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(157,78,221,0.6)] transition-all duration-300 mt-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Criando conta...
              </>
            ) : (
              "Cadastrar"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center border-t border-border/50 pt-4">
        <div className="text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="text-primary font-semibold hover:text-primary/80 transition-colors"
          >
            Faça login
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
