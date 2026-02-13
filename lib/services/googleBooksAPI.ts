import {IBookMetadata} from "../models/bookMetadata.model";

// --- Interfaces para a resposta da API (sem alterações) ---
interface GoogleVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: {type: string; identifier: string}[];
  pageCount?: number;
  categories?: string[];
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  language?: string;
}

interface GoogleBookItem {
  volumeInfo?: GoogleVolumeInfo;
}

interface GoogleBooksApiResponse {
  totalItems?: number;
  items?: GoogleBookItem[];
}

/**
 * Busca metadados de um livro na Google Books API usando o ISBN.
 * @param isbn O ISBN a ser pesquisado.
 * @returns Um objeto IBookMetadata parcial ou null se não encontrado/erro.
 */
export async function getBookMetadataFromGoogle(
  isbn: string,
): Promise<Partial<IBookMetadata> | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const searchISBN = isbn.trim();

  // --- VERIFICAÇÃO DA API KEY (Log para depuração) ---
  if (!apiKey) {
    console.warn(
      "Chave da Google Books API não está configurada em .env.local (GOOGLE_BOOKS_API_KEY). Usando cota anônima, que pode falhar ou retornar resultados vazios.",
    );
  } else {
    // console.log("Usando chave da Google Books API."); // Descomente para confirmar que a chave foi lida
  }
  // --------------------------------------------------------

  // Constrói a URL da API, priorizando resultados em português.
  const encodedISBN = encodeURIComponent(searchISBN);
  let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${encodedISBN}&langRestrict=pt&key=${apiKey}`;
  // ------------------------------------------------------

  console.log(
    `Buscando ISBN ${searchISBN} na Google Books API... URL: ${apiUrl}`,
  );

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorBody = await response.text(); // Lê o corpo do erro como texto
      console.error(
        `Erro na API Google Books (${response.status}): ${response.statusText}`,
        `Corpo do Erro: ${errorBody}`, // Loga o corpo do erro para mais detalhes
      );
      return null;
    }

    const data: GoogleBooksApiResponse = await response.json();

    // Verifica se algum item foi retornado
    if (
      data.totalItems &&
      data.totalItems > 0 &&
      data.items &&
      data.items.length > 0
    ) {
      const volumeInfo = data.items[0].volumeInfo;

      if (!volumeInfo) {
        console.log(
          `ISBN ${searchISBN} encontrado, mas sem informações detalhadas (volumeInfo).`,
        );
        return null;
      }

      // --- MELHORIA: Combina título e subtítulo ---
      const fullTitle = volumeInfo.subtitle
        ? `${volumeInfo.title}: ${volumeInfo.subtitle}`
        : volumeInfo.title;
      // ---------------------------------------------

      // Mapeia os dados da API para o nosso formato IBookMetadata
      const mappedData: Partial<IBookMetadata> = {
        isbn: searchISBN,
        title: fullTitle, // Usa o título completo
        authors: volumeInfo.authors || [],
        publisher: volumeInfo.publisher,
        year: volumeInfo.publishedDate
          ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10) || undefined
          : undefined,
        pageCount: volumeInfo.pageCount,
        description: volumeInfo.description,
        coverImageUrl:
          volumeInfo.imageLinks?.thumbnail ||
          volumeInfo.imageLinks?.smallThumbnail,
        subjects: volumeInfo.categories || [],
        sourceApi: "google",
      };

      // Remove campos que ficaram como `undefined` do objeto final
      Object.keys(mappedData).forEach(
        key =>
          (mappedData as any)[key] === undefined &&
          delete (mappedData as any)[key],
      );

      console.log(
        `Dados encontrados para ISBN ${searchISBN} na Google Books API.`,
      );
      return mappedData;
    } else {
      console.log(
        `Nenhum resultado encontrado para ISBN ${searchISBN} na Google Books API.`,
      );
      return null; // Nenhum livro encontrado
    }
  } catch (error: any) {
    console.error(
      "Erro ao conectar ou processar resposta da Google Books API:",
      error,
    );
    return null;
  }
}
