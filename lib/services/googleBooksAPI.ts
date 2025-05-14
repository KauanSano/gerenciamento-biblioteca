import {IBookMetadata} from "../models/bookMetadata.model"; // Ajuste o caminho

// Interface simplificada para a resposta da Google Books API (VolumeInfo)
interface GoogleVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string; // Pode ser 'YYYY', 'YYYY-MM', 'YYYY-MM-DD'
  description?: string;
  industryIdentifiers?: {type: string; identifier: string}[];
  pageCount?: number;
  categories?: string[]; // Assuntos/Categorias
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  language?: string; // Código de idioma (ex: 'pt', 'en')
  // Adicione outros campos se precisar
}

// Interface simplificada para o item principal da resposta
interface GoogleBookItem {
  volumeInfo?: GoogleVolumeInfo;
  // Adicione outros campos do item se precisar
}

// Interface simplificada para a resposta completa da API
interface GoogleBooksApiResponse {
  kind?: string;
  totalItems?: number;
  items?: GoogleBookItem[];
}

// Mapeamento simples de códigos de idioma para os valores do nosso Enum
function mapLanguageCode(code?: string): string {
  if (!code) return "outro";
  const lowerCode = code.toLowerCase();
  if (lowerCode === "pt" || lowerCode === "pt-br") return "português";
  if (lowerCode === "en" || lowerCode === "en-us" || lowerCode === "en-gb")
    return "inglês";
  if (lowerCode === "es") return "espanhol";
  return "outro"; // Default para outros idiomas
}

/**
 * Busca metadados de um livro na Google Books API usando o ISBN.
 * @param isbn O ISBN a ser pesquisado.
 * @returns Um objeto IBookMetadata parcial ou null se não encontrado/erro.
 */
export async function getBookMetadataFromGoogle(
  isbn: string
): Promise<Partial<IBookMetadata> | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const searchISBN = isbn.trim(); // Garante que não há espaços extras

  // Constrói a URL da API. Se tiver chave, adiciona.
  let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${searchISBN}`;
  if (apiKey) {
    apiUrl += `&key=${apiKey}`;
  } else {
    console.warn(
      "Chave da Google Books API não configurada. Limites de uso podem ser atingidos."
    );
  }

  console.log(`Buscando ISBN ${searchISBN} na Google Books API...`);

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      // Loga o erro mas não quebra a aplicação necessariamente
      console.error(
        `Erro na API Google Books (${response.status}): ${response.statusText}`
      );
      // Poderia tentar analisar o corpo do erro: const errorBody = await response.json();
      return null; // Retorna null em caso de erro da API
    }

    const data: GoogleBooksApiResponse = await response.json();

    // Verifica se algum item foi retornado
    if (
      data.totalItems &&
      data.totalItems > 0 &&
      data.items &&
      data.items.length > 0
    ) {
      // Pega as informações do primeiro volume encontrado (geralmente o mais relevante para ISBN)
      const volumeInfo = data.items[0].volumeInfo;

      if (!volumeInfo) {
        console.log(`ISBN ${searchISBN} encontrado, mas sem volumeInfo.`);
        return null;
      }

      // Mapeia os dados da API para o nosso formato IBookMetadata
      const mappedData: Partial<IBookMetadata> = {
        isbn: searchISBN, // Usa o ISBN fornecido para garantir consistência
        title: volumeInfo.title,
        authors: volumeInfo.authors || [],
        publisher: volumeInfo.publisher,
        // Extrai apenas o ano de publishedDate (se existir e for válido)
        year: volumeInfo.publishedDate
          ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10) || undefined
          : undefined,
        pageCount: volumeInfo.pageCount,
        description: volumeInfo.description,
        // Pega a melhor imagem de capa disponível
        coverImageUrl:
          volumeInfo.imageLinks?.thumbnail ||
          volumeInfo.imageLinks?.smallThumbnail,
        subjects: volumeInfo.categories || [],
        // language: mapLanguageCode(volumeInfo.language), // Mapeia código para nosso enum (opcional)
        sourceApi: "google", // Indica a origem
      };

      // Remove campos undefined do objeto mapeado antes de retornar
      Object.keys(mappedData).forEach(
        key =>
          (mappedData as any)[key] === undefined &&
          delete (mappedData as any)[key]
      );

      console.log(
        `Dados encontrados para ISBN ${searchISBN} na Google Books API.`
      );
      return mappedData;
    } else {
      console.log(
        `Nenhum resultado encontrado para ISBN ${searchISBN} na Google Books API.`
      );
      return null; // Nenhum livro encontrado
    }
  } catch (error: any) {
    console.error(
      "Erro ao conectar ou processar resposta da Google Books API:",
      error
    );
    return null; // Retorna null em caso de erro de rede ou processamento
  }
}
