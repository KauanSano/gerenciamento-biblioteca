"use client";

import React, {useState} from "react";
import {useForm, SubmitHandler} from "react-hook-form"; // Exemplo com react-hook-form
import {zodResolver} from "@hookform/resolvers/zod"; // Exemplo com Zod
import * as z from "zod"; // Zod para validação
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Loader2} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Exemplo Select
import {IsbnLookupInput} from "./IsbnLookupInput"; // Importa o componente de busca
import {IBookMetadata} from "@/lib/models/bookMetadata.model"; // Ajuste o caminho
import {toast} from "sonner";

// --- Esquema de Validação (Exemplo com Zod) ---
const inventoryItemSchema = z.object({
  isbn: z.string().min(1, "ISBN é necessário após busca"), // Validar formato talvez?
  title: z.string().min(1, "Título é obrigatório"),
  authors: z.string().optional(), // Autores podem vir como string da API
  publisher: z.string().optional(),
  year: z.number().optional(),
  // --- Campos específicos do InventoryItem ---
  sku: z.string().min(1, "SKU é obrigatório"),
  condition: z.enum(["novo", "usado"], {
    required_error: "Condição é obrigatória",
  }),
  salePrice: z.coerce.number().positive("Preço de venda deve ser positivo"),
  costPrice: z.coerce.number().min(0).optional(), // Custo é opcional
  stockOwn: z.coerce.number().int().min(0).optional().default(0),
  binding: z.enum(["brochura", "capa dura", "espiral", "outro"]), // Binding é obrigatório (default 'outro')
  language: z.enum(["português", "inglês", "espanhol", "outro"]), // Language é obrigatório (default 'outro')
  description: z.string().optional(),
  label: z.string().optional(),
});

type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;

export function AddInventoryItemForm() {
  const [foundBookData, setFoundBookData] =
    useState<Partial<IBookMetadata> | null>(null);
  const [lookupIsbn, setLookupIsbn] = useState<string>(""); // Guarda o ISBN que foi buscado
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      // Valores padrão do formulário
      isbn: "",
      title: "",
      sku: "",
      condition: undefined, // Começa sem seleção
      salePrice: undefined,
      stockOwn: 0,
      binding: "outro",
      language: "outro",
    },
  });

  // Callback quando o ISBN é encontrado com sucesso
  const handleLookupSuccess = (
    bookMetadata: Partial<IBookMetadata>,
    source: string
  ) => {
    toast.success(
      `Livro encontrado! (Fonte: ${
        source === "internal" ? "Interna" : "Externa"
      })`
    );
    setFoundBookData(bookMetadata); // Guarda os dados encontrados
    setLookupIsbn(bookMetadata.isbn || ""); // Guarda o ISBN confirmado

    // ---- Preenche o formulário com os dados encontrados ----
    form.setValue("isbn", bookMetadata.isbn || ""); // Preenche ISBN no form (pode ser hidden)
    form.setValue("title", bookMetadata.title || "");
    form.setValue("authors", bookMetadata.authors?.join(", ") || ""); // Junta autores com vírgula
    form.setValue("publisher", bookMetadata.publisher || "");
    form.setValue("year", bookMetadata.year || undefined); // Usa undefined se não houver ano
    // Você pode decidir se quer preencher outros campos como binding/language aqui
    // form.setValue('language', bookMetadata.language || 'outro'); // Exemplo

    // Limpa erros anteriores do form, se houver
    form.clearErrors();
  };

  // Callback quando o ISBN não é encontrado
  const handleLookupNotFound = (isbn: string) => {
    toast.warning("ISBN não encontrado.", {
      description: "Você precisará preencher os dados manualmente.",
    });
    setFoundBookData(null); // Limpa dados anteriores
    setLookupIsbn(isbn); // Guarda o ISBN tentado
    // Limpa campos que seriam preenchidos pela busca, mas mantém o ISBN digitado? Ou limpa tudo?
    // form.reset({...form.control._defaultValues, isbn: isbn}); // Reseta mantendo ISBN
    form.setValue("isbn", isbn); // Mantém o ISBN no campo oculto/visível
    form.setValue("title", ""); // Limpa título, etc.
    form.setValue("authors", "");
    form.setValue("publisher", "");
    form.setValue("year", undefined);
  };

  // Callback em caso de erro na API de lookup
  const handleLookupError = (message: string) => {
    // O toast já foi mostrado pelo componente IsbnLookupInput
    console.error("Erro no lookup:", message);
    setFoundBookData(null);
    setLookupIsbn("");
  };

  // Função chamada ao submeter o formulário completo
  const onSubmit: SubmitHandler<InventoryItemFormData> = async data => {
    setIsSubmitting(true);
    console.log("Dados a serem enviados para /api/inventory:", data);

    // Mapear dados do formulário para o formato esperado pela API de criação de InventoryItem
    const inventoryItemPayload = {
      // tenantId: // Pegar da sessão/contexto do usuário logado!
      bookMetadata: foundBookData?._id, // Passar o ID do BookMetadata se encontrado? Ou só o ISBN? Depende da API de inventário
      centralBookIsbn: lookupIsbn, // Envia o ISBN que foi usado na busca/digitado
      sku: data.sku,
      condition: data.condition,
      price: {
        sale: data.salePrice,
        cost: data.costPrice ?? 0, // Default custo 0 se não preenchido
      },
      stock: {
        own: data.stockOwn ?? 0,
        consigned: 0, // Adicionar campo se necessário
      },
      binding: data.binding,
      language: data.language,
      description: data.description || foundBookData?.description, // Usa descrição específica ou a padrão?
      label: data.label,
      // ... outros campos como isResale, coverImageUrl específico...
    };

    // Verificação extra: Se bookMetadata não foi encontrado, talvez exigir Título/Autor?
    if (
      !inventoryItemPayload.centralBookIsbn &&
      (!data.title || !data.authors)
    ) {
      // Poderia mostrar um erro ou apenas enviar assim mesmo?
      // Depende da sua regra de negócio e da API de criação de inventário
    }

    try {
      // *** AQUI VOCÊ CHAMA SUA API POST /api/inventory ***
      // const response = await fetch('/api/inventory', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify(inventoryItemPayload),
      // });
      // const result = await response.json();
      // if (!response.ok) throw new Error(result.message || 'Erro ao salvar item');

      toast.success("Item de inventário salvo com sucesso! (Simulado)");
      form.reset(); // Limpa o formulário
      setFoundBookData(null);
      setLookupIsbn("");
      // Chamar alguma função para atualizar a tabela de inventário? props.onSuccess() ?
    } catch (error: any) {
      console.error("Erro ao salvar item:", error);
      toast.error("Erro ao salvar", {description: error.message});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-4 max-w-2xl mx-auto"
    >
      {/* Seção de Busca ISBN */}
      <IsbnLookupInput
        onSuccess={handleLookupSuccess}
        onNotFound={handleLookupNotFound}
        onError={handleLookupError}
      />

      {/* Linha divisória ou espaço */}
      <hr className="my-6" />

      {/* Campos preenchidos pela busca (podem ser read-only ou editáveis) */}
      {/* Campo ISBN oculto ou visível para referência */}
      <input type="hidden" {...form.register("isbn")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Título*</Label>
          <Input
            id="title"
            {...form.register("title")}
            readOnly={!!foundBookData}
          />{" "}
          {/* Ex: Readonly se veio da busca */}
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
            readOnly={!!foundBookData}
          />
        </div>
        <div>
          <Label htmlFor="publisher">Editora</Label>
          <Input
            id="publisher"
            {...form.register("publisher")}
            readOnly={!!foundBookData}
          />
        </div>
        <div>
          <Label htmlFor="year">Ano</Label>
          <Input
            id="year"
            type="number"
            {...form.register("year", {valueAsNumber: true})}
            readOnly={!!foundBookData}
          />
        </div>
      </div>

      {/* Campos específicos do Exemplar (Sempre Editáveis) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
        <div>
          <Label htmlFor="sku">SKU* (Identificador Único da Loja)</Label>
          <Input id="sku" {...form.register("sku")} />
          {form.formState.errors.sku && (
            <p className="text-sm text-red-600">
              {form.formState.errors.sku.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="condition">Condição*</Label>
          <Select
            onValueChange={value =>
              form.setValue("condition", value as "novo" | "usado")
            }
            value={form.watch("condition")}
          >
            <SelectTrigger id="condition">
              <SelectValue placeholder="Selecione a condição" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="usado">Usado</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.condition && (
            <p className="text-sm text-red-600">
              {form.formState.errors.condition.message}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="salePrice">Preço de Venda* (R$)</Label>
          <Input
            id="salePrice"
            type="number"
            step="0.01"
            {...form.register("salePrice")}
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
          />
        </div>
        <div>
          <Label htmlFor="stockOwn">Estoque Próprio</Label>
          <Input
            id="stockOwn"
            type="number"
            step="1"
            {...form.register("stockOwn")}
          />
        </div>
        {/* Adicionar outros campos: Acabamento, Idioma (Selects?), Label, Descrição (Textarea) */}
        <div>
          <Label htmlFor="binding">Acabamento</Label>
          <Select
            onValueChange={value =>
              form.setValue("binding", value as AcabamentoLivro)
            }
            value={form.watch("binding")}
          >
            <SelectTrigger id="binding">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brochura">Brochura</SelectItem>
              <SelectItem value="capa dura">Capa Dura</SelectItem>
              <SelectItem value="espiral">Espiral</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="language">Idioma</Label>
          <Select
            onValueChange={value =>
              form.setValue("language", value as IdiomaLivro)
            }
            value={form.watch("language")}
          >
            <SelectTrigger id="language">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="português">Português</SelectItem>
              <SelectItem value="inglês">Inglês</SelectItem>
              <SelectItem value="espanhol">Espanhol</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="label">Localização/Etiqueta</Label>
          <Input id="label" {...form.register("label")} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição Específica</Label>
          <Textarea
            id="description"
            {...form.register("description")}
            placeholder="Detalhes sobre este exemplar específico..."
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        Salvar Item no Inventário
      </Button>
    </form>
  );
}
