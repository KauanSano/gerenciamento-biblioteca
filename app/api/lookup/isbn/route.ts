import {NextResponse} from "next/server";

export async function GET(req: Request) {
  const {searchParams} = new URL(req.url);
  const isbn = searchParams.get("isbn");

  if (!isbn) {
    return NextResponse.json({error: "ISBN é obrigatório"}, {status: 400});
  }

  // Remove caracteres não numéricos (exceto X para ISBN-10)
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");

  try {
    // Consulta API do Google Books
    const googleBooksUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}`;
    const res = await fetch(googleBooksUrl);

    if (!res.ok) {
      console.error("Erro Google Books API:", res.status, res.statusText);
      return NextResponse.json(
        {error: "Erro ao consultar serviço de livros"},
        {status: res.status},
      );
    }

    const data = await res.json();

    // Verifica se encontrou algum livro
    if (!data.items || data.items.length === 0) {
      return NextResponse.json(null, {status: 404});
    }

    // Pega o primeiro resultado
    const volumeInfo = data.items[0].volumeInfo;

    // Tenta encontrar o ISBN-13 específico nos identificadores, se disponível
    const isbn13Obj = volumeInfo.industryIdentifiers?.find(
      (id: any) => id.type === "ISBN_13",
    );
    const foundIsbn13 = isbn13Obj ? isbn13Obj.identifier : undefined;

    // Mapeamento PLANO para o Frontend
    // Isso garante que data.title não seja undefined no componente
    const bookData = {
      title: volumeInfo.title || "Título Desconhecido",
      authors: volumeInfo.authors || [],
      isbn: cleanIsbn,
      isbn13: foundIsbn13,
      publisher: volumeInfo.publisher,
      publishedDate: volumeInfo.publishedDate,
      description: volumeInfo.description,
      pageCount: volumeInfo.pageCount,
      categories: volumeInfo.categories,
      imageLinks: volumeInfo.imageLinks,
      language: volumeInfo.language || "pt-BR",
    };

    return NextResponse.json(bookData);
  } catch (error) {
    console.error("Erro interno na rota ISBN:", error);
    return NextResponse.json(
      {error: "Erro interno do servidor"},
      {status: 500},
    );
  }
}
