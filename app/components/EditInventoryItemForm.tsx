// app/components/EditInventoryItemForm.tsx
"use client";

import React, {useState, useEffect, useRef} from "react";
import {useForm, SubmitHandler, Controller} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import {toast} from "sonner";
import {Loader2, UploadCloud, XCircle} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {IInventoryItem} from "@/lib/models/inventoryItem.model";

const inventoryItemFormSchema = z.object({
  isbn: z.string().optional(),
  title: z.string().min(1, "Título é obrigatório."),
  authors: z.string().optional(),
  publisher: z.string().optional(),
  year: z.coerce.number().int().positive().optional().or(z.literal("")),
  description: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  sku: z.string().min(1, "SKU é obrigatório."),
  condition: z.enum(["novo", "usado"]),
  salePrice: z.coerce.number().positive("Preço deve ser positivo."),
  costPrice: z.coerce.number().min(0).optional().or(z.literal("")),
  stockOwn: z.coerce
    .number()
    .int()
    .min(0, "Estoque não pode ser negativo.")
    .default(0),
  binding: z.enum(["brochura", "capa dura", "espiral", "outro"]),
  language: z.enum(["português", "inglês", "espanhol", "outro"]),
  itemSpecificDescription: z.string().optional(),
  label: z.string().optional(),
});

type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

interface EditInventoryItemFormProps {
  itemToEdit: IInventoryItem;
  onSuccess: () => void;
  onCancel: () => void;
}

export function EditInventoryItemForm({
  itemToEdit,
  onSuccess,
  onCancel,
}: EditInventoryItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    itemToEdit.coverImageUrl || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      isbn: itemToEdit.isbn || "",
      title: itemToEdit.title || "",
      authors: itemToEdit.authors?.join(", ") || "",
      publisher: itemToEdit.publisher || "",
      year: itemToEdit.year || undefined,
      description: itemToEdit.description || "",
      coverImageUrl: itemToEdit.coverImageUrl || "",
      sku: itemToEdit.sku || "",
      condition: itemToEdit.condition,
      salePrice: itemToEdit.price.sale,
      costPrice: itemToEdit.price.cost || undefined,
      stockOwn: itemToEdit.stock.own,
      binding: itemToEdit.binding || "outro",
      language: itemToEdit.language || "português",
      itemSpecificDescription: itemToEdit.itemSpecificDescription || "",
      label: itemToEdit.label || "",
    },
  });

  useEffect(() => {
    form.reset({
      isbn: itemToEdit.isbn || "",
      title: itemToEdit.title || "",
      authors: itemToEdit.authors?.join(", ") || "",
      publisher: itemToEdit.publisher || "",
      year: itemToEdit.year || undefined,
      description: itemToEdit.description || "",
      coverImageUrl: itemToEdit.coverImageUrl || "",
      sku: itemToEdit.sku || "",
      condition: itemToEdit.condition,
      salePrice: itemToEdit.price.sale,
      costPrice: itemToEdit.price.cost || undefined,
      stockOwn: itemToEdit.stock.own,
      binding: itemToEdit.binding || "outro",
      language: itemToEdit.language || "português",
      itemSpecificDescription: itemToEdit.itemSpecificDescription || "",
      label: itemToEdit.label || "",
    });
    setImagePreview(itemToEdit.coverImageUrl || null);
  }, [itemToEdit, form]);

  const handleImageFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    form.setValue("coverImageUrl", "");
  };

  const onSubmit: SubmitHandler<InventoryItemFormData> = async formData => {
    setIsSubmitting(true);
    const dataPayload = new FormData();
    (Object.keys(formData) as Array<keyof InventoryItemFormData>).forEach(
      key => {
        const value = formData[key];
        if (key === "authors" && typeof value === "string") {
          value
            .split(",")
            .map(a => a.trim())
            .filter(Boolean)
            .forEach(author => dataPayload.append("authors", author));
        } else if (value !== undefined && value !== null && value !== "") {
          dataPayload.append(key, String(value));
        }
      }
    );

    if (fileInputRef.current?.files?.[0]) {
      dataPayload.append("coverImageFile", fileInputRef.current.files[0]);
    } else if (!imagePreview) {
      dataPayload.append("removeCoverImage", "true");
    }

    try {
      const response = await fetch(`/api/inventory/${itemToEdit._id}`, {
        method: "PUT",
        body: dataPayload,
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || "Falha ao atualizar o item.");
      }
      toast.success("Item atualizado com sucesso!");
      onSuccess();
    } catch (error: any) {
      toast.error("Erro na Atualização", {description: error.message});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Título*</Label>
          <Input
            id="title"
            {...form.register("title")}
            disabled={isSubmitting}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-600">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="authors">Autor(es)</Label>
          <Input
            id="authors"
            {...form.register("authors")}
            disabled={isSubmitting}
          />
        </div>
        {/* Outros campos aqui... */}
      </div>
      <div>
        <Label htmlFor="coverImageFile">Imagem da Capa</Label>
        <div className="mt-1 flex items-center gap-x-3">
          {imagePreview ? (
            <div className="relative group">
              <Image
                src={imagePreview}
                alt="Preview"
                width={80}
                height={120}
                className="h-28 w-auto object-contain rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={removeImage}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="h-28 w-20 flex items-center justify-center rounded border bg-muted">
              <UploadCloud className="h-8 w-8" />
            </div>
          )}
          <Input
            id="coverImageFile"
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            disabled={isSubmitting}
          />
        </div>
      </div>
      <hr />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="sku">SKU*</Label>
          <Input id="sku" {...form.register("sku")} disabled={isSubmitting} />
          {form.formState.errors.sku && (
            <p className="text-sm text-red-600">
              {form.formState.errors.sku.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="salePrice">Preço Venda (R$)*</Label>
          <Input
            id="salePrice"
            type="number"
            step="0.01"
            {...form.register("salePrice")}
            disabled={isSubmitting}
          />
          {form.formState.errors.salePrice && (
            <p className="text-sm text-red-600">
              {form.formState.errors.salePrice.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="stockOwn">Estoque*</Label>
          <Input
            id="stockOwn"
            type="number"
            {...form.register("stockOwn")}
            disabled={isSubmitting}
          />
          {form.formState.errors.stockOwn && (
            <p className="text-sm text-red-600">
              {form.formState.errors.stockOwn.message}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </form>
  );
}
