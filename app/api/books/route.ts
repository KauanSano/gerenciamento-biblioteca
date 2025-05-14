import {NextResponse} from "next/server";
import dbConnect from "../../../lib/db/dbConnect";
import {Book} from "../../../lib/models/bookSchema";

export async function GET(request: Request) {
  await dbConnect();

  try {
    // Parâmetros de paginação e ordenação (exemplo básico)
    // Poderia adicionar busca/filtros aqui também, lendo searchParams
    const books = await Book.find({}); // Busca todos os livros
    // .sort({ createdAt: -1 }) // Ordena pelos mais recentes
    // .limit(50); // Limita a quantidade
    return NextResponse.json({data: books}, {status: 200});
  } catch (error: any) {
    console.error("Erro ao buscar livros:", error);
    return NextResponse.json(
      {message: "Erro interno do servidor ao buscar livros."},
      {status: 500}
    );
  }
}

// inserir rotas para PUT (update) e DELETE em /api/books/[id]/route.ts | [id = sku]
// para as ações de Editar e Excluir da DataTable
