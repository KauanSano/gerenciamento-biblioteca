"use client";

import React, {useState, useCallback, ChangeEvent, KeyboardEvent} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {
  Loader2,
  Search,
  AlertCircle,
  CheckCircle,
  HelpCircle,
} from "lucide-react"; // Ícones
import {IBookMetadata} from "@/lib/models/bookMetadata.model"; // Ajuste o caminho

// Interface para as propriedades do componente
interface IsbnLookupInputProps {
  // Callbacks para comunicar o resultado ao componente pai
  onSuccess: (
    bookMetadata: Partial<IBookMetadata>,
    source: "internal" | "external"
  ) => void;
  onNotFound: (isbn: string) => void;
  onError: (message: string) => void;
  // Valor inicial opcional
  initialValue?: string;
  // Prop opcional para desabilitar o input/botão
  disabled?: boolean;
}

// Enum para estados visuais do input/botão
enum LookupStatus {
  IDLE = "idle", // Estado inicial ou após sucesso/erro
  LOADING = "loading", // Buscando na API
  FOUND = "found", // Encontrado (interno ou externo)
  NOT_FOUND = "not_found", // Não encontrado em nenhuma fonte
  ERROR = "error", // Erro na API/rede
}

export function IsbnLookupInput({
  onSuccess,
  onNotFound,
  onError,
  initialValue = "",
  disabled = false,
}: IsbnLookupInputProps) {
  const [isbnInput, setIsbnInput] = useState(initialValue);
  const [status, setStatus] = useState<LookupStatus>(LookupStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Função para limpar o estado e feedback visual
  const resetState = () => {
    setStatus(LookupStatus.IDLE);
    setErrorMessage(null);
  };

  // Função que chama a API de lookup
  const handleLookup = useCallback(async () => {
    // Limpa ISBN (remove hífens, espaços) - opcional mas recomendado
    const cleanedIsbn = isbnInput.replace(/[-\s]/g, "");

    // Validação simples (ex: tem 10 ou 13 dígitos?) - opcional
    if (!/^\d{10}$|^\d{13}$/.test(cleanedIsbn)) {
      setStatus(LookupStatus.ERROR);
      setErrorMessage("Formato de ISBN inválido (deve ter 10 ou 13 dígitos).");
      onError("Formato de ISBN inválido."); // Notifica o pai
      return;
    }

    setStatus(LookupStatus.LOADING);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/lookup/isbn?isbn=${cleanedIsbn}`); // Chama nossa API orchestradora
      const result = await response.json();

      if (response.ok) {
        setStatus(LookupStatus.FOUND);
        onSuccess(result.data, result.source); // Chama callback de sucesso com os dados e a origem
      } else if (response.status === 404) {
        setStatus(LookupStatus.NOT_FOUND);
        setErrorMessage(result.message || "Livro não encontrado.");
        onNotFound(cleanedIsbn); // Chama callback de não encontrado
      } else {
        // Outros erros da API (ex: 500)
        throw new Error(result.message || `Erro ${response.status} na busca.`);
      }
    } catch (error: any) {
      console.error("Erro ao buscar ISBN:", error);
      setStatus(LookupStatus.ERROR);
      setErrorMessage(error.message || "Falha ao buscar informações do livro.");
      onError(error.message || "Falha ao buscar informações do livro."); // Chama callback de erro
    }
    // Não resetamos isLoading aqui, usamos o 'status' para feedback visual
  }, [isbnInput, onSuccess, onNotFound, onError]);

  // Handler para mudança no input
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    // Reseta o estado visual se o usuário começar a digitar novamente
    if (status !== LookupStatus.IDLE && status !== LookupStatus.LOADING) {
      resetState();
    }
    setIsbnInput(e.target.value);
  };

  // Handler para tecla pressionada (detectar Enter) - Opcional
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isbnInput.trim() !== "") {
      e.preventDefault(); // Evita submissão de formulário pai, se houver
      handleLookup();
    }
  };

  // Determina o ícone a ser exibido ao lado do botão
  const renderStatusIcon = () => {
    switch (status) {
      case LookupStatus.LOADING:
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case LookupStatus.FOUND:
        // Poderia sumir após um tempo ou ao digitar de novo
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case LookupStatus.NOT_FOUND:
        return <HelpCircle className="h-4 w-4 text-orange-500" />;
      case LookupStatus.ERROR:
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: // IDLE
        // Não mostra ícone ou um ícone neutro, se preferir
        return null;
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="isbn-lookup">ISBN</Label>
      <div className="flex items-center space-x-2">
        <Input
          id="isbn-lookup"
          type="text" // Usar text permite hífens, mas a validação remove
          placeholder="Digite ou escaneie o ISBN"
          value={isbnInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown} // Adiciona listener para Enter
          disabled={disabled || status === LookupStatus.LOADING} // Desabilita durante carregamento
          className={status === LookupStatus.ERROR ? "border-red-500" : ""} // Estilo de erro
        />
        <Button
          type="button" // Importante para não submeter formulário pai
          onClick={handleLookup}
          disabled={
            disabled || !isbnInput.trim() || status === LookupStatus.LOADING
          } // Desabilita se vazio ou carregando
          variant="outline"
          size="icon" // Tamanho de ícone para o botão
        >
          {status === LookupStatus.LOADING ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className="sr-only">Buscar ISBN</span> {/* Acessibilidade */}
        </Button>
        {/* Ícone de status ao lado do botão */}
        <div className="h-4 w-4 ml-1">{renderStatusIcon()}</div>
      </div>
      {/* Exibe mensagem de erro */}
      {status === LookupStatus.ERROR && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
      {/* Exibe mensagem de não encontrado (opcional) */}
      {status === LookupStatus.NOT_FOUND && errorMessage && (
        <p className="text-sm text-orange-500">{errorMessage}</p>
      )}
    </div>
  );
}
