// components/AddInventoryItemForm.tsx
"use client";

import React, {useState, useEffect, useRef} from "react";
import {useForm, SubmitHandler, Controller} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {IsbnLookupInput} from "./IsbnLookupInput";
import {IBookMetadata} from "@/lib/models/bookMetadata.model"; // Usado apenas para o tipo de retorno do lookup
import {toast} from "sonner";
import {Loader2, UploadCloud, XCircle} from "lucide-react";
import {useSession} from "next-auth/react";
import Image from "next/image"; // Para preview da imagem

const inventoryItemFormSchema = z.object({
  // Campos do Livro (editáveis)
  isbn: z.string().optional(),
  title: z.string().min(1, "Título é obrigatório."),
  authors: z.string().optional(), // String de autores separados por vírgula
  publisher: z.string().optional(),
  year: z.coerce.number().int().positive().optional().or(z.literal("")), // Permite string vazia, converte para número
  description: z.string().optional(), // Descrição geral do livro
  // coverImageFile: typeof window === 'undefined' ? z.any() : z.instanceof(FileList).optional(), // Para upload de arquivo
  coverImageUrlDisplay: z.string().optional(), // Para exibir URL da API do Google ou existente

  // Campos do Exemplar
  sku: z.string().min(1, "SKU é obrigatório."),
  condition: z.enum(["novo", "usado"], {
    required_error: "Condição é obrigatória.",
  }),
  salePrice: z.coerce
    .number({invalid_type_error: "Preço deve ser um número."})
    .positive("Preço de venda deve ser positivo."),
  costPrice: z.coerce
    .number({invalid_type_error: "Preço deve ser um número."})
    .min(0)
    .optional()
    .or(z.literal("")),
  stockOwn: z.coerce
    .number({invalid_type_error: "Estoque deve ser um número."})
    .int()
    .min(0)
    .optional()
    .default(0),
  binding: z.enum(["brochura", "capa dura", "espiral", "outro"], {
    required_error: "Acabamento é obrigatório.",
  }),
  language: z.enum(["português", "inglês", "espanhol", "outro"], {
    required_error: "Idioma é obrigatório.",
  }),
  itemSpecificDescription: z.string().optional(),
  label: z.string().optional(),
});

type InventoryItemFormData = z.infer<typeof inventoryItemFormSchema>;

interface AddInventoryItemFormProps {
  onSuccess?: () => void;
}

export function AddInventoryItemForm({onSuccess}: AddInventoryItemFormProps) {
  const {data: session} = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Referência para o input de arquivo

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemFormSchema),
    defaultValues: {
      isbn: "",
      title: "",
      authors: "",
      publisher: "",
      year: undefined,
      description: "",
      sku: "",
      condition: undefined,
      salePrice: undefined,
      costPrice: undefined,
      stockOwn: 1,
      binding: "outro",
      language: "português",
      itemSpecificDescription: "",
      label: "",
      coverImageUrlDisplay: "",
    },
  });

  // Handler quando o IsbnLookupInput encontra dados
  const handleLookupSuccess = (
    bookDataFromApi: Partial<IBookMetadata>,
    source: string
  ) => {
    toast.success(`Dados do livro encontrados! (Fonte: ${source})`);
    form.reset({
      // Reseta o formulário com os novos dados, mantendo o que já foi digitado para SKU, etc.
      ...form.getValues(), // Mantém valores já digitados para SKU, condição, preço, etc.
      isbn: bookDataFromApi.isbn || "",
      title: bookDataFromApi.title || "",
      authors: bookDataFromApi.authors?.join(", ") || "",
      publisher: bookDataFromApi.publisher || "",
      year: bookDataFromApi.year || undefined,
      description: bookDataFromApi.description || "",
      coverImageUrlDisplay: bookDataFromApi.coverImageUrl || "",
    });
    if (bookDataFromApi.coverImageUrl) {
      setImagePreview(bookDataFromApi.coverImageUrl);
    } else {
      setImagePreview(null);
    }
    form.clearErrors();
  };

  const handleLookupNotFound = (isbn: string) => {
    toast.warning("ISBN não encontrado.", {
      description: "Preencha os dados do livro manualmente.",
    });
    form.reset({
      ...form.getValues(),
      isbn: isbn,
      title: "",
      authors: "",
      publisher: "",
      year: undefined,
      description: "",
      coverImageUrlDisplay: "",
    });
    setImagePreview(null);
  };

  const handleLookupError = (message: string) => {
    toast.error("Erro na Busca ISBN", {description: message});
    setImagePreview(null);
  };

  // Handler para mudança no input de arquivo
  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      // form.setValue('coverImageFile', event.target.files); // react-hook-form lida com isso
    } else {
      setImagePreview(null);
      // form.setValue('coverImageFile', undefined);
    }
  };

  const onSubmit: SubmitHandler<InventoryItemFormData> = async formData => {
    setIsSubmitting(true);
    const tenantId = (session?.user as any)?.activeTenantId;
    if (!tenantId) {
      toast.error("Erro de Sessão", {description: "Nenhuma loja ativa."});
      setIsSubmitting(false);
      return;
    }

    // Usar FormData para enviar arquivo e outros dados
    const dataPayload = new FormData();
    dataPayload.append("tenantId", tenantId);

    // Adiciona todos os campos do formulário ao FormData
    (Object.keys(formData) as Array<keyof InventoryItemFormData>).forEach(
      key => {
        const value = formData[key];
        if (key === "authors" && typeof value === "string") {
          value
            .split(",")
            .map(a => a.trim())
            .filter(Boolean)
            .forEach(author => dataPayload.append("authors[]", author));
        } else if (value !== undefined && value !== null && value !== "") {
          // @ts-ignore
          dataPayload.append(
            key,
            value instanceof FileList ? value[0] : String(value)
          );
        }
      }
    );

    // Adiciona o arquivo de imagem, se existir no input ref
    if (fileInputRef.current?.files?.[0]) {
      dataPayload.append("coverImageFile", fileInputRef.current.files[0]);
    }

    console.log("Enviando payload para /api/inventory (FormData):");
    // Para debugar FormData:
    // for (let [key, value] of dataPayload.entries()) {
    //     console.log(key, value);
    // }

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        body: dataPayload, // Envia como FormData (NÃO JSON.stringify)
        // headers: { 'Content-Type': 'multipart/form-data' } // O browser define automaticamente com FormData
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.errors) {
          Object.entries(result.errors).forEach(
            ([field, error]: [string, any]) => {
              form.setError(field as keyof InventoryItemFormData, {
                type: "server",
                message: error.message,
              });
            }
          );
        }
        throw new Error(result.message || `Erro ${response.status}`);
      }

      toast.success("Item de inventário salvo com sucesso!");
      form.reset();
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; // Limpa o input de arquivo
      onSuccess?.();
    } catch (error: any) {
      toast.error("Falha ao Salvar", {description: error.message});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {/* Seção de Busca ISBN (opcional para preenchimento) */}
      <IsbnLookupInput
        onSuccess={handleLookupSuccess}
        onNotFound={handleLookupNotFound}
        onError={handleLookupError}
        disabled={isSubmitting}
      />
      <hr className="my-4" />

      {/* Campos de Metadados do Livro*/}
      <h3 className="text-lg font-semibold">Dados do Livro</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="isbn">ISBN</Label>
          <Input
            id="isbn"
            {...form.register("isbn")}
            placeholder="ISBN (opcional)"
            disabled={isSubmitting}
          />
        </div>
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
          <Label htmlFor="authors">
            Autor(es){" "}
            <span className="text-xs text-muted-foreground">
              (separados por vírgula)
            </span>
          </Label>
          <Input
            id="authors"
            {...form.register("authors")}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="publisher">Editora</Label>
          <Input
            id="publisher"
            {...form.register("publisher")}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="year">Ano</Label>
          <Input
            id="year"
            type="number"
            {...form.register("year")}
            disabled={isSubmitting}
          />
        </div>
        <div className="md:col-span-2">
          <Label htmlFor="description">Descrição Geral do Livro</Label>
          <Textarea
            id="description"
            {...form.register("description")}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Upload de Imagem da Capa */}
      <div className="pt-2">
        <Label htmlFor="coverImageFile">Imagem da Capa</Label>
        <div className="mt-1 flex items-center gap-x-3">
          {imagePreview ? (
            <div className="relative group">
              <Image
                src={imagePreview}
                alt="Preview da capa"
                width={80}
                height={120}
                className="h-28 w-auto object-contain rounded border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => {
                  setImagePreview(null);
                  if (fileInputRef.current) fileInputRef.current.value = ""; // Limpa o input de arquivo
                  form.setValue("coverImageUrlDisplay", ""); // Limpa URL se veio da API
                }}
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Remover imagem</span>
              </Button>
            </div>
          ) : (
            <div className="h-28 w-20 flex items-center justify-center rounded border bg-muted text-muted-foreground">
              <UploadCloud className="h-8 w-8" />
            </div>
          )}
          <Input
            id="coverImageFile"
            type="file"
            accept="image/png, image/jpeg, image/webp"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
            disabled={isSubmitting}
          />
        </div>
        {form.watch("coverImageUrlDisplay") && !imagePreview && (
          <p className="text-xs text-muted-foreground mt-1">
            Capa encontrada via API:{" "}
            <a
              href={form.watch("coverImageUrlDisplay")}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              ver imagem
            </a>
            . Selecione um novo arquivo para substituir.
          </p>
        )}
      </div>

      <hr className="my-4" />
      <h3 className="text-lg font-semibold">Detalhes do Exemplar</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SKU, Condição, Preços, Estoque, Acabamento, Idioma, Label */}
        <div>
          <Label htmlFor="sku">SKU (Seu Cód. Interno)*</Label>
          <Input id="sku" {...form.register("sku")} disabled={isSubmitting} />
          {form.formState.errors.sku && (
            <p className="text-sm text-red-600">
              {form.formState.errors.sku.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="condition">Condição*</Label>
          <Controller
            name="condition"
            control={form.control}
            render={({field}) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="usado">Usado</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.condition && (
            <p className="text-sm text-red-600">
              {form.formState.errors.condition.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="salePrice">Preço de Venda (R$)*</Label>
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
          <Label htmlFor="costPrice">Preço de Custo (R$)</Label>
          <Input
            id="costPrice"
            type="number"
            step="0.01"
            {...form.register("costPrice")}
            disabled={isSubmitting}
          />
        </div>
        <div>
          <Label htmlFor="stockOwn">Estoque Próprio*</Label>
          <Input
            id="stockOwn"
            type="number"
            step="1"
            {...form.register("stockOwn")}
            disabled={isSubmitting}
          />
          {form.formState.errors.stockOwn && (
            <p className="text-sm text-red-600">
              {form.formState.errors.stockOwn.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="binding">Acabamento*</Label>
          <Controller
            name="binding"
            control={form.control}
            render={({field}) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brochura">Brochura</SelectItem>
                  <SelectItem value="capa dura">Capa Dura</SelectItem>
                  <SelectItem value="espiral">Espiral</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.binding && (
            <p className="text-sm text-red-600">
              {form.formState.errors.binding.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="language">Idioma*</Label>
          <Controller
            name="language"
            control={form.control}
            render={({field}) => (
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="português">Português</SelectItem>
                  <SelectItem value="inglês">Inglês</SelectItem>
                  <SelectItem value="espanhol">Espanhol</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.language && (
            <p className="text-sm text-red-600">
              {form.formState.errors.language.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="label">Localização/Etiqueta (Interna)</Label>
          <Input
            id="label"
            {...form.register("label")}
            disabled={isSubmitting}
          />
        </div>
      </div>
      <div className="pt-2 md:col-span-2">
        <Label htmlFor="itemSpecificDescription">
          Descrição Específica do Exemplar
        </Label>
        <Textarea
          id="itemSpecificDescription"
          {...form.register("itemSpecificDescription")}
          placeholder="Ex: Leves marcas de uso na capa, miolo em perfeito estado..."
          disabled={isSubmitting}
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto mt-6"
      >
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Salvar Item no Inventário
      </Button>
    </form>
  );
}
