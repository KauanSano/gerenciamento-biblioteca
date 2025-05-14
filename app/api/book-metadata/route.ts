// app/api/book-metadata/route.ts // Ou src/app/api/book-metadata/route.ts

import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import {BookMetadata} from "@/lib/models/bookMetadata.model";

/**
 * GET Handler para buscar metadados de livro por ISBN.
 * Exemplo de chamada: /api/book-metadata?isbn=978XXXXXXXXXX
 */
export async function GET(request: Request) {
  // Extrai os parâmetros de busca da URL
  const {searchParams} = new URL(request.url);
  const isbn = searchParams.get("isbn"); // Pega o valor do parâmetro 'isbn'

  // Validação básica do ISBN recebido
  if (!isbn) {
    return NextResponse.json(
      {message: "Parâmetro ISBN é obrigatório."},
      {status: 400}
    );
  }
  // Poderia adicionar mais validações de formato do ISBN aqui se desejado

  try {
    await dbConnect(); // Garante a conexão com o banco

    // Busca no banco de dados pelo ISBN fornecido
    const bookMeta = await BookMetadata.findOne({isbn: isbn.trim()}).lean(); // .lean() para retornar um objeto JS puro

    // Verifica se o livro foi encontrado
    if (!bookMeta) {
      return NextResponse.json(
        {message: "Livro não encontrado na base de dados interna."},
        {status: 404}
      );
    }

    // Retorna os dados do livro encontrado
    return NextResponse.json({data: bookMeta}, {status: 200});
  } catch (error: any) {
    console.error("Erro ao buscar metadados do livro:", error);
    // Evita expor detalhes do erro interno
    let errorMessage = "Erro interno do servidor ao buscar metadados do livro.";
    if (error.name === "CastError") {
      // Exemplo: ID mal formatado se buscasse por ID
      errorMessage = "Formato de parâmetro inválido.";
      return NextResponse.json({message: errorMessage}, {status: 400});
    }
    return NextResponse.json({message: errorMessage}, {status: 500});
  }
}

// NOTA: Por enquanto, esta API só faz a busca (GET).
// Endpoints para POST (criar), PUT (atualizar), DELETE para BookMetadata
// seriam criados aqui ou em rotas separadas (ex: /api/book-metadata/[isbn])
// conforme a necessidade (provavelmente com acesso restrito/admin).
