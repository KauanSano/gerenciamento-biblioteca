// app/api/books/import/route.ts
import {NextResponse} from "next/server";
// Ajuste os caminhos conforme a estrutura REAL do seu projeto
import dbConnect from "../../../../lib/db/dbConnect";
import {Book, IBook} from "../../../../lib/models/bookSchema"; // Exemplo

export async function POST(request: Request) {
  await dbConnect();

  try {
    const {books} = await request.json();

    if (!Array.isArray(books) || books.length === 0) {
      return NextResponse.json(
        {message: "Nenhum livro fornecido para importação."},
        {status: 400}
      );
    }

    let insertedCount = 0;
    let errorsCount = 0;
    const errorsDetails: {isbn?: string; sku?: string; error: string}[] = [];

    const results = await Promise.allSettled(
      books.map(async (bookData: Partial<IBook>) => {
        if (!bookData.sku) {
          throw new Error(
            "SKU é obrigatório e não foi encontrado nos dados enviados."
          );
        }

        return Book.findOneAndUpdate(
          {sku: bookData.sku}, // Condição: Encontra pelo SKU
          {$set: bookData}, // Dados para atualizar ou inserir
          {
            new: true, // Retorna o documento atualizado/inserido
            upsert: true, // Cria o documento se não existir
            runValidators: true, // Roda as validações do schema Mongoose (IMPORTANTE)
            setDefaultsOnInsert: true, // Aplica valores padrão na inserção
          }
        );
      })
    );
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        insertedCount++;
      } else {
        errorsCount++;
        // Tenta pegar ISBN e SKU para log, mesmo que possam ser undefined
        const currentSku = books[index]?.sku;
        const currentIsbn = books[index]?.isbn || "N/A"; // Mostra N/A se ISBN estiver ausente
        const errorMessage =
          result.reason?.message || "Erro desconhecido na operação DB.";

        errorsDetails.push({
          isbn: currentIsbn,
          sku: currentSku,
          error: errorMessage,
        });
        console.error(
          `Erro ao importar/atualizar livro (SKU: ${
            currentSku || "N/A"
          }, ISBN: ${currentIsbn}):`,
          result.reason // Loga o erro completo do Mongoose/DB
        );
      }
    });
    const responseMessage = `Importação concluída. ${insertedCount} livros processados com sucesso. ${errorsCount} erros.`;
    console.log(responseMessage);
    if (errorsCount > 0) {
      console.error("Detalhes dos erros:", errorsDetails);
    }

    return NextResponse.json(
      {
        message: responseMessage,
        insertedCount,
        errorsCount,
        errors: errorsDetails,
      },
      {status: errorsCount > 0 ? 207 : 200}
    );
  } catch (error: any) {
    // --- Tratamento de Erros Gerais da API (Inalterado) ---
    console.error("Erro GERAL na API de importação:", error);
    if (error.name === "ValidationError") {
      return NextResponse.json(
        {message: "Erro de validação Mongoose.", errors: error.errors},
        {status: 400}
      );
    }
    if (error.code === 11000) {
      // Erro de chave duplicada (geralmente SKU ou ISBN se presente)
      return NextResponse.json(
        {
          message: "Erro: Chave duplicada encontrada (SKU ou ISBN já existe?).",
          details: error.keyValue,
        },
        {status: 409}
      );
    }
    return NextResponse.json(
      {
        message:
          error.message || "Erro interno do servidor ao importar livros.",
      },
      {status: 500}
    );
  }
}
