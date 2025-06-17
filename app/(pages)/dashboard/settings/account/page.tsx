// app/(pages)/dashboard/settings/account/page.tsx
"use client";

import React, {useState, useEffect} from "react";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {useSession} from "next-auth/react";
import {toast} from "sonner";
import {Loader2} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {ITenant} from "@/lib/models/tenant.model";

const accountFormSchema = z.object({
  name: z.string().min(2, "O nome da loja deve ter pelo menos 2 caracteres."),
  cnpj: z.string().optional(),
  phone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      number: z.string().optional(),
      neighborhood: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

export default function AccountSettingsPage() {
  const {data: session} = useSession();
  const [tenant, setTenant] = useState<ITenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const tenantId = (session?.user as any)?.activeTenantId;

  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      cnpj: "",
      phone: "",
      address: {
        street: "",
        number: "",
        neighborhood: "",
        city: "",
        state: "",
        zipCode: "",
      },
    },
  });

  useEffect(() => {
    if (tenantId) {
      const fetchTenantData = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/tenants/${tenantId}`);
          if (!response.ok)
            throw new Error("Não foi possível carregar os dados da loja.");
          const result = await response.json();
          setTenant(result.data);
          // Popula o formulário com os dados recebidos
          form.reset({
            name: result.data.name || "",
            cnpj: result.data.cnpj || "",
            phone: result.data.phone || "",
            address: {
              street: result.data.address?.street || "",
              number: result.data.address?.number || "",
              neighborhood: result.data.address?.neighborhood || "",
              city: result.data.address?.city || "",
              state: result.data.address?.state || "",
              zipCode: result.data.address?.zipCode || "",
            },
          });
        } catch (error: any) {
          toast.error("Erro", {description: error.message});
        } finally {
          setIsLoading(false);
        }
      };
      fetchTenantData();
    }
  }, [tenantId, form]);

  const onSubmit = async (data: AccountFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Falha ao salvar as alterações.");
      toast.success("Dados da loja atualizados com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao Salvar", {description: error.message});
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return <div className="p-8">Nenhuma loja selecionada ou encontrada.</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Informações da Loja</CardTitle>
          <CardDescription>
            Atualize os dados cadastrais da sua loja ou sebo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Loja</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                {...form.register("cnpj")}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              {...form.register("phone")}
              placeholder="(00) 00000-0000"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>
            Informe o endereço físico da sua loja.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="address.street">Logradouro</Label>
              <Input id="address.street" {...form.register("address.street")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.number">Número</Label>
              <Input id="address.number" {...form.register("address.number")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address.neighborhood">Bairro</Label>
              <Input
                id="address.neighborhood"
                {...form.register("address.neighborhood")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.city">Cidade</Label>
              <Input id="address.city" {...form.register("address.city")} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address.state">Estado</Label>
              <Input id="address.state" {...form.register("address.state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address.zipCode">CEP</Label>
              <Input
                id="address.zipCode"
                {...form.register("address.zipCode")}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}
