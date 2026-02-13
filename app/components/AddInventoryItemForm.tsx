"use client";

import {useState} from "react";
import {useForm} from "react-hook-form";
import {toast} from "sonner";
import {Loader2, Search} from "lucide-react";
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
import IsbnLookupInput from "./IsbnLookupInput";

export default function AddInventoryItemForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const {register, handleSubmit, setValue, watch, reset} = useForm();

  // Função chamada quando o IsbnLookupInput encontra um livro
  const handleBookFound = (bookData: any) => {
    setValue("title", bookData.title);
    setValue("isbn", bookData.isbn);
    setValue("authors", bookData.authors?.join(", "));
    setValue("publisher", bookData.publisher);
    // Outros campos se necessário
  };

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          ...data,
          // Converte autores de string para array se necessário no backend
          authors: data.authors
            ? data.authors.split(",").map((a: string) => a.trim())
            : [],
        }),
      });

      if (res.ok) {
        toast.success("Livro adicionado ao estoque!");
        reset();
        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao adicionar");
      }
    } catch (error) {
      toast.error("Erro de conexão");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Busca Automática por ISBN */}
      <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
        <Label className="mb-2 block text-muted-foreground text-sm">
          Preenchimento Automático
        </Label>
        <IsbnLookupInput onBookFound={handleBookFound} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="isbn">ISBN</Label>
            <Input id="isbn" {...register("isbn")} placeholder="978..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sku">SKU / Código (Opcional)</Label>
            <Input
              id="sku"
              {...register("sku")}
              placeholder="Seu código interno"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Título do Livro</Label>
          <Input
            id="title"
            {...register("title", {required: true})}
            placeholder="O Senhor dos Anéis"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="authors">Autores (separados por vírgula)</Label>
          <Input
            id="authors"
            {...register("authors")}
            placeholder="J.R.R. Tolkien"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              {...register("quantity", {value: 1})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Preço de Venda (R$)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              {...register("price", {value: 0})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="condition">Condição</Label>
            <Select
              onValueChange={val => setValue("condition", val)}
              defaultValue="used"
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Novo</SelectItem>
                <SelectItem value="used">Usado</SelectItem>
                <SelectItem value="damaged">Danificado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Localização Física</Label>
          <Input
            id="location"
            {...register("location")}
            placeholder="Estante A, Prateleira 2"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notas Internas</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Detalhes sobre o estado do item..."
          />
        </div>

        <div className="pt-4 flex justify-end">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar no Estoque
          </Button>
        </div>
      </form>
    </div>
  );
}
