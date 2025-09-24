// app/components/InviteUserForm.tsx
"use client";

import React, {useState} from "react";
import {useForm, SubmitHandler, Controller} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {toast} from "sonner";
import {Loader2} from "lucide-react";

const inviteFormSchema = z.object({
  email: z
    .string()
    .min(1, "O e-mail é obrigatório.")
    .email("Formato de e-mail inválido."),
  role: z.enum(["admin", "staff"], {
    required_error: "É necessário selecionar um papel.",
  }),
});

type InviteFormData = z.infer<typeof inviteFormSchema>;

interface InviteUserFormProps {
  tenantId: string;
  onSuccess?: () => void;
}

export function InviteUserForm({tenantId, onSuccess}: InviteUserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "staff",
    },
  });

  const onSubmit: SubmitHandler<InviteFormData> = async data => {
    setIsSubmitting(true);
    const toastId = toast.loading("Enviando convite...");

    try {
      const response = await fetch("/api/tenants/invite", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({...data, tenantId}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Falha ao enviar convite.");
      }

      toast.success("Convite enviado com sucesso!", {
        id: toastId,
        description: `Usuário adicionado à loja com o papel de ${data.role}.`,
      });

      form.reset();
      onSuccess?.();
    } catch (error: any) {
      toast.error("Falha no Convite", {
        id: toastId,
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail do Convidado</Label>
        <Input
          id="email"
          type="email"
          placeholder="exemplo@email.com"
          {...form.register("email")}
          disabled={isSubmitting}
        />
        {form.formState.errors.email && (
          <p className="text-sm text-red-600">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="role">Papel na Loja</Label>
        <Controller
          name="role"
          control={form.control}
          render={({field}) => (
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um papel..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Funcionário(a)</SelectItem>
                <SelectItem value="admin">Administrador(a)</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {form.formState.errors.role && (
          <p className="text-sm text-red-600">
            {form.formState.errors.role.message}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Adicionar Usuário à Loja
      </Button>
    </form>
  );
}
