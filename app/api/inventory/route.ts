import {NextResponse} from "next/server";
import {getServerSession} from "next-auth";
import dbConnect from "@/lib/db/dbConnect";
import InventoryItem from "@/lib/models/inventoryItem.model";
import Book from "@/lib/models/bookSchema";
import {authOptions} from "../auth/[...nextauth]/route";

// LISTAR ESTOQUE DO USUÁRIO
export async function GET(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({error: "Não autorizado"}, {status: 401});
  }

  try {
    const {searchParams} = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * limit;

    // Filtro base: Itens do usuário logado
    let query: any = {user: session.user.id};

    // Se tiver busca, precisamos buscar nos livros primeiro (populando)
    // Para simplificar em MongoDB sem agregações complexas, buscamos livros que dão match e filtramos os itens
    if (search) {
      // Estratégia simples: Buscar IDs de livros que batem com o titulo/isbn
      const books = await Book.find({
        $or: [
          {title: {$regex: search, $options: "i"}},
          {isbn: {$regex: search, $options: "i"}},
          {isbn13: {$regex: search, $options: "i"}},
        ],
      }).select("_id");

      const bookIds = books.map(b => b._id);

      // Adiciona à query: Itens cujo livro está na lista OU sku bate com a busca
      query = {
        user: session.user.id,
        $or: [{book: {$in: bookIds}}, {sku: {$regex: search, $options: "i"}}],
      };
    }

    const totalItems = await InventoryItem.countDocuments(query);

    const items = await InventoryItem.find(query)
      .populate("book") // Traz os dados do livro
      .sort({createdAt: -1})
      .skip(skip)
      .limit(limit);

    return NextResponse.json({
      data: items,
      pagination: {
        total: totalItems,
        page,
        limit,
        pages: Math.ceil(totalItems / limit),
      },
    });
  } catch (error) {
    console.error("Erro ao listar estoque:", error);
    return NextResponse.json({error: "Erro interno"}, {status: 500});
  }
}

// ADICIONAR ITEM AO ESTOQUE
export async function POST(req: Request) {
  await dbConnect();
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({error: "Não autorizado"}, {status: 401});
  }

  try {
    const body = await req.json();

    // 1. Verificar ou Criar o Livro (Metadados Globais/Compartilhados)
    let bookId = body.bookId;

    if (!bookId) {
      // Se não enviou ID, tenta achar por ISBN ou cria novo
      if (!body.isbn && !body.title) {
        return NextResponse.json(
          {error: "Dados do livro insuficientes (ISBN ou Título)"},
          {status: 400},
        );
      }

      // Procura livro existente (Global)
      let book = await Book.findOne({
        $or: [{isbn: body.isbn}, {isbn13: body.isbn}],
      });

      if (!book) {
        // Cria novo livro (Metadados)
        book = await Book.create({
          title: body.title,
          authors: body.authors || ["Desconhecido"],
          isbn: body.isbn,
          isbn13: body.isbn?.length === 13 ? body.isbn : undefined,
          publisher: body.publisher,
          publishedDate: body.publishedDate,
          description: body.description,
          pageCount: body.pageCount,
          categories: body.categories,
          imageLinks: body.imageLinks,
          language: body.language || "pt-BR",
        });
      }
      bookId = book._id;
    }

    // 2. Criar o Item de Inventário (Vinculado ao Usuário)
    const newItem = await InventoryItem.create({
      user: session.user.id, // VINCULO CRUCIAL
      book: bookId,
      sku: body.sku,
      condition: body.condition || "used",
      price: body.price || 0,
      quantity: body.quantity || 1,
      location: body.location,
      status: "available",
      notes: body.notes,
    });

    const populatedItem = await newItem.populate("book");

    return NextResponse.json(populatedItem, {status: 201});
  } catch (error) {
    console.error("Erro ao adicionar item:", error);
    return NextResponse.json({error: "Erro ao salvar item"}, {status: 500});
  }
}
