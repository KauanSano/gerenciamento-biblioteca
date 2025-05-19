// app/api/lookup/isbn/route.ts

import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect"; // << AJUSTE O CAMINHO!
import {BookMetadata} from "@/lib/models/bookMetadata.model"; // << AJUSTE O CAMINHO!
import {getBookMetadataFromGoogle} from "@/lib/services/googleBooksAPI"; // << AJUSTE O CAMINHO!

/**
 * GET Handler para buscar metadados de livro por ISBN, orquestrando
 * busca interna e externa (Google Books API).
 * Salva no banco interno se encontrado externamente.
 * Exemplo de chamada: /api/lookup/isbn?isbn=978XXXXXXXXXX
 */
export async function GET(request: Request) {
  const {searchParams} = new URL(request.url);
  const isbn = searchParams.get("isbn");

  if (!isbn || isbn.trim() === "") {
    return NextResponse.json(
      {message: "Parâmetro ISBN é obrigatório."},
      {status: 400}
    );
  }

  const cleanIsbn = isbn.trim();

  try {
    await dbConnect();

    // 1. Busca no banco de dados interno primeiro
    console.log(`Buscando ISBN ${cleanIsbn} internamente...`);
    const internalResult = await BookMetadata.findOne({isbn: cleanIsbn}).lean();

    if (internalResult) {
      console.log(`ISBN ${cleanIsbn} encontrado internamente.`);
      // Retorna dados internos, indicando a origem
      return NextResponse.json(
        {
          data: internalResult,
          source: "internal", // Indica que veio do DB interno
        },
        {status: 200}
      );
    }

    // 2. Se não encontrou internamente, busca na API externa
    console.log(
      `ISBN ${cleanIsbn} não encontrado internamente. Buscando externamente...`
    );
    const externalResult = await getBookMetadataFromGoogle(cleanIsbn);

    if (!externalResult) {
      console.log(`ISBN ${cleanIsbn} não encontrado externamente.`);
      // Retorna 404 se não encontrado em nenhuma fonte
      return NextResponse.json(
        {
          message: "Livro não encontrado na base interna ou externa.",
          source: "none", // Indica que não foi encontrado
        },
        {status: 404}
      );
    }

    // 3. Se encontrou externamente, SALVA no banco interno
    console.log(
      `ISBN ${cleanIsbn} encontrado externamente. Salvando internamente...`
    );
    try {
      // Cria uma nova instância do modelo com os dados externos
      // O Mongoose vai validar os dados contra o BookMetadataSchema
      const newBookMeta = new BookMetadata(externalResult);
      // Salva no banco de dados
      await newBookMeta.save();
      console.log(`ISBN ${cleanIsbn} salvo com sucesso no banco interno.`);

      // Retorna os dados RECÉM-SALVOS (que agora incluem _id, etc.), indicando a origem
      return NextResponse.json(
        {
          data: newBookMeta.toObject(), // Converte para objeto JS simples
          source: "external", // Indica que veio da API externa e foi salvo
        },
        {status: 200}
      );
    } catch (saveError: any) {
      // Trata erros especificamente durante o save
      console.error(
        `Erro ao salvar ISBN ${cleanIsbn} vindo da API externa:`,
        saveError
      );
      // Verifica se o erro é de chave duplicada (pode acontecer em condição de corrida)
      if (saveError.code === 11000) {
        // Outra requisição pode ter salvado o mesmo ISBN enquanto esta estava processando.
        // Tenta buscar novamente no banco interno para retornar o dado já existente.
        console.log(
          `ISBN ${cleanIsbn} provavelmente já foi salvo por outra requisição. Buscando novamente...`
        );
        const existingBook = await BookMetadata.findOne({
          isbn: cleanIsbn,
        }).lean();
        if (existingBook) {
          return NextResponse.json(
            {data: existingBook, source: "internal"},
            {status: 200}
          );
        } else {
          // Se mesmo assim não encontrar, retorna erro genérico
          return NextResponse.json(
            {
              message:
                "Erro ao salvar dados externos e não encontrado após conflito.",
              source: "error",
            },
            {status: 500}
          );
        }
      }
      // Outros erros de save (ex: falha de validação do Mongoose)
      return NextResponse.json(
        {
          message: `Erro ao salvar dados da API externa: ${saveError.message}`,
          source: "error",
        },
        {status: 500}
      );
    }
  } catch (error: any) {
    console.error(`Erro geral na API de lookup para ISBN ${cleanIsbn}:`, error);
    return NextResponse.json(
      {
        message: "Erro interno do servidor durante a busca do livro.",
        source: "error",
      },
      {status: 500}
    );
  }
}
