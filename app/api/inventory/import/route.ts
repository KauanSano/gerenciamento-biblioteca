// app/api/inventory/import/route.ts

import {NextResponse} from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/dbConnect"; // Ajuste o caminho se necessário
import {InventoryItem, IInventoryItem} from "@/lib/models/inventoryItem.model"; // Ajuste o caminho
import {getServerSession} from "next-auth/next";
import {authOptions} from "../../auth/[...nextauth]/route"; // Ajuste o caminho

// Helper para obter dados da sessão (mantido como no artefato anterior)
async function getUserSessionData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log("API /api/inventory/import: Nenhuma sessão ou ID de usuário.");
    return null;
  }
  const userData = session.user as any; // Use sua tipagem global de next-auth.d.ts se configurada
  return {
    userId: userData.id,
    tenantId: userData.activeTenantId || null,
  };
}

export async function POST(request: Request) {
  const sessionData = await getUserSessionData();
  if (!sessionData?.userId || !sessionData?.tenantId) {
    return NextResponse.json(
      {message: "Não autorizado ou nenhuma loja/sebo selecionado."},
      {status: 401}
    );
  }
  const {userId, tenantId} = sessionData;

  try {
    const {books: importedBooks} = await request.json(); // Recebe a lista de livros processados pelo frontend

    if (!Array.isArray(importedBooks) || importedBooks.length === 0) {
      return NextResponse.json(
        {message: "Nenhum livro fornecido para importação."},
        {status: 400}
      );
    }

    await dbConnect();

    let insertedCount = 0;
    let errorsCount = 0;
    const errorsDetails: {
      sku?: string;
      isbn?: string;
      title?: string;
      error: string;
      line?: number;
    }[] = [];

    for (let index = 0; index < importedBooks.length; index++) {
      // 'bookDataFromSheet' é o objeto vindo do ExcelUpload.tsx.
      // Ele foi tipado como Partial<IBook> lá, mas aqui vamos mapear para IInventoryItem.
      const bookDataFromSheet = importedBooks[index] as any; // Usamos 'any' temporariamente para flexibilidade no acesso aos campos

      // Validação mínima dos dados essenciais
      if (!bookDataFromSheet.sku) {
        errorsCount++;
        errorsDetails.push({
          title: bookDataFromSheet.title,
          error: "SKU é obrigatório e não foi encontrado/extraído.",
          line: index + 1,
        });
        console.error(
          `SKU faltando para Título: ${
            bookDataFromSheet.title || "Desconhecido"
          }`
        );
        continue;
      }
      if (!bookDataFromSheet.title) {
        errorsCount++;
        errorsDetails.push({
          sku: bookDataFromSheet.sku,
          error: "Título é obrigatório e não foi encontrado.",
          line: index + 1,
        });
        console.error(`Título faltando para SKU: ${bookDataFromSheet.sku}`);
        continue;
      }
      // Adicione outras validações de campos obrigatórios aqui se necessário
      // (ex: condition, price.sale) - o schema Mongoose também fará isso.

      // Preparar dados para InventoryItem, incluindo todos os campos do livro
      const inventoryItemData: Partial<IInventoryItem> = {
        tenant: tenantId,
        addedBy: userId,
        status: "available", // Default status

        // Campos do livro (diretamente do bookDataFromSheet)
        title: bookDataFromSheet.title,
        // --- MAPEAMENTO CORRIGIDO PARA AUTHORS ---
        // ExcelUpload envia 'author' como string (potencialmente com vírgulas)
        // Convertendo para array de strings
        authors:
          typeof bookDataFromSheet.author === "string" &&
          bookDataFromSheet.author.trim() !== ""
            ? bookDataFromSheet.author
                .split(",")
                .map((name: string) => name.trim())
                .filter(Boolean)
            : [],
        publisher: bookDataFromSheet.publisher,
        year: bookDataFromSheet.year,
        isbn: bookDataFromSheet.isbn,
        pageCount: bookDataFromSheet.pageCount,
        // --- MAPEAMENTO CORRIGIDO PARA SUBJECTS (DE CATEGORY) ---
        // ExcelUpload envia 'category' como array de strings
        subjects: Array.isArray(bookDataFromSheet.category)
          ? bookDataFromSheet.category
          : [],
        description: bookDataFromSheet.description, // Descrição geral do livro (após extração do SKU)
        coverImageUrl: bookDataFromSheet.cover_image, // Se 'cover_image' for enviado pelo ExcelUpload

        // Campos específicos do exemplar (diretamente do bookDataFromSheet)
        sku: String(bookDataFromSheet.sku).trim(),
        condition: bookDataFromSheet.condition,
        price: {
          cost: bookDataFromSheet.price?.cost ?? 0,
          sale: bookDataFromSheet.price?.sale,
          discount: bookDataFromSheet.price?.discount,
        },
        stock: {
          own: bookDataFromSheet.stock?.own ?? 0,
          consigned: bookDataFromSheet.stock?.consigned ?? 0,
        },
        binding: bookDataFromSheet.binding,
        language: bookDataFromSheet.language,
        // itemSpecificDescription: bookDataFromSheet.itemSpecificDescription, // Se a planilha tivesse este campo
        label: bookDataFromSheet.label,
        isResale: bookDataFromSheet.isResale, // Se a planilha tivesse este campo
      };

      // Upsert InventoryItem (baseado em tenantId e SKU)
      try {
        await InventoryItem.findOneAndUpdate(
          {tenant: tenantId, sku: inventoryItemData.sku},
          {$set: inventoryItemData},
          {
            upsert: true,
            runValidators: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        );
        insertedCount++;
      } catch (itemError: any) {
        errorsCount++;
        let errorMessage = "Erro ao salvar item no inventário.";
        if (itemError.code === 11000) {
          errorMessage = `SKU '${inventoryItemData.sku}' já existe para esta loja.`;
        } else if (itemError.name === "ValidationError") {
          errorMessage = `Erro de validação para SKU '${
            inventoryItemData.sku
          }': ${Object.values(itemError.errors)
            .map((e: any) => e.message)
            .join(", ")}`;
        } else {
          errorMessage = itemError.message || errorMessage;
        }
        errorsDetails.push({
          sku: inventoryItemData.sku,
          isbn: bookDataFromSheet.isbn,
          title: bookDataFromSheet.title,
          error: errorMessage,
          line: index + 1,
        });
        console.error(
          `Erro ao salvar InventoryItem (SKU: ${inventoryItemData.sku}):`,
          itemError
        );
      }
    } // Fim do loop for

    const responseMessage = `Importação de inventário concluída. ${insertedCount} itens processados com sucesso. ${errorsCount} erros.`;
    console.log(responseMessage);
    if (errorsCount > 0)
      console.error(
        "Detalhes dos erros na importação de inventário:",
        errorsDetails
      );

    return NextResponse.json(
      {
        message: responseMessage,
        insertedCount,
        errorsCount,
        errors: errorsDetails,
      },
      {
        status:
          errorsCount > 0 && insertedCount === 0
            ? 400
            : errorsCount > 0
            ? 207
            : 200,
      }
    );
  } catch (error: any) {
    console.error("Erro GERAL na API de importação de inventário:", error);
    return NextResponse.json(
      {
        message:
          error.message || "Erro interno do servidor ao importar inventário.",
      },
      {status: 500}
    );
  }
}
