import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import {authOptions} from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/db/dbConnect";
import InventoryItem from "@/lib/models/inventoryItem.model";
import Book from "@/lib/models/bookSchema";
import * as XLSX from "xlsx"; // Certifique-se de ter 'xlsx' instalado: npm install xlsx

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({error: "Não autorizado"}, {status: 401});
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        {error: "Nenhum arquivo enviado"},
        {status: 400},
      );
    }

    // Ler o arquivo
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, {type: "buffer"});
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    await dbConnect();

    let successCount = 0;
    let errors: string[] = [];

    // Processar cada linha
    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Mapeamento flexível das colunas (aceita variações comuns)
      const isbn = row["ISBN"] || row["isbn"] || row["Isbn"];
      const title =
        row["Título"] || row["Titulo"] || row["Title"] || row["title"];
      const sku =
        row["SKU"] || row["sku"] || row["Código"] || `AUTO-${Date.now()}-${i}`;
      const price = parseFloat(
        row["Preço"] || row["Price"] || row["price"] || "0",
      );
      const quantity = parseInt(
        row["Quantidade"] || row["Qtd"] || row["Quantity"] || "1",
      );
      const condition = (
        row["Condição"] ||
        row["Condition"] ||
        "used"
      ).toLowerCase();
      const location = row["Localização"] || row["Location"] || "";

      if (!title && !isbn) {
        errors.push(`Linha ${i + 2}: Título ou ISBN obrigatório.`);
        continue;
      }

      try {
        // 1. Busca ou Cria Livro (Metadados)
        let book;
        if (isbn) {
          // Limpa o ISBN (remove traços)
          const cleanIsbn = String(isbn).replace(/[^0-9X]/gi, "");
          book = await Book.findOne({
            $or: [{isbn: cleanIsbn}, {isbn13: cleanIsbn}],
          });
        }

        if (!book && title) {
          // Tenta buscar por título exato se não achou por ISBN
          book = await Book.findOne({
            title: {$regex: new RegExp(`^${title}$`, "i")},
          });
        }

        if (!book) {
          // Cria novo livro básico
          book = await Book.create({
            title: title || "Título Desconhecido",
            isbn: isbn ? String(isbn).replace(/[^0-9X]/gi, "") : undefined,
            authors: [row["Autor"] || "Desconhecido"],
            publisher: row["Editora"],
            language: "pt-BR",
          });
        }

        // 2. Cria Item no Estoque do Usuário
        await InventoryItem.create({
          user: session.user.id,
          book: book._id,
          sku: String(sku),
          price: isNaN(price) ? 0 : price,
          quantity: isNaN(quantity) ? 1 : quantity,
          condition: ["new", "used", "damaged"].includes(condition)
            ? condition
            : "used",
          location: String(location),
          status: "available",
        });

        successCount++;
      } catch (err: any) {
        console.error(`Erro na linha ${i + 2}:`, err);
        errors.push(`Linha ${i + 2}: Erro ao salvar - ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Erro na importação:", error);
    return NextResponse.json(
      {error: "Erro ao processar arquivo"},
      {status: 500},
    );
  }
}
