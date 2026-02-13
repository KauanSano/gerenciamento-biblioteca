"use client";

import {useState} from "react";
import {Search, Loader2, BookOpen} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";

interface IsbnLookupInputProps {
  onBookFound: (bookData: any) => void;
}

export default function IsbnLookupInput({onBookFound}: IsbnLookupInputProps) {
  const [isbn, setIsbn] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    // Remove caracteres não numéricos e 'X' (para ISBN-10)
    const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");

    if (cleanIsbn.length < 10) {
      toast.error("ISBN inválido", {
        description: "O ISBN deve ter pelo menos 10 caracteres.",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Chama a nossa API interna que conecta com Google Books ou outra fonte
      const response = await fetch(`/api/lookup/isbn?isbn=${cleanIsbn}`);

      if (!response.ok) {
        throw new Error("Livro não encontrado");
      }

      const data = await response.json();

      if (data) {
        toast.success("Livro encontrado!", {
          description: `Título: ${data.title}`,
        });
        onBookFound(data);
        setIsbn("");
      } else {
        toast.warning("Livro não encontrado.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro na busca", {
        description: "Não foi possível encontrar informações para este ISBN.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="flex w-full items-center space-x-2">
      <div className="relative flex-1">
        <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Digite o ISBN (ex: 9788533613379)"
          value={isbn}
          onChange={e => setIsbn(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-9"
          disabled={isLoading}
        />
      </div>
      <Button
        type="button"
        onClick={handleSearch}
        disabled={isLoading || isbn.length < 3}
        variant="secondary"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Search className="mr-2 h-4 w-4" />
            Buscar
          </>
        )}
      </Button>
    </div>
  );
}
