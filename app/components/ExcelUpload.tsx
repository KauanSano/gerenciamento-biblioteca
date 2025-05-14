"use client";

import React, {useState, ChangeEvent} from "react";
import * as XLSX from "xlsx";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {toast} from "sonner";
import {
  IBook,
  CondicaoLivro,
  AcabamentoLivro,
  IdiomaLivro,
} from "../../lib/models/bookSchema";

// ========================================================================
// MAPEAMENTO DE COLUNAS E FUNÇÕES AUXILIARES
// ========================================================================

const COLUMN_MAPPING: {[key: string]: string} = {
  "ISBN/ISSN": "isbn",
  "Autor*": "author",
  "Título*": "title",
  "Editora*": "publisher",
  "Ano*": "year",
  "Preço*": "price.sale", // Mapeado para Preço de Venda
  "Conservação:Descrição*": "extractSkuAndDescription", // Chave especial para extrair SKU e Descrição
  "Peso(g)": "weight",
  "Tipo:Novo/Usado*": "condition", // Será tratado para extrair 'novo'/'usado'
  "Idioma": "language", // Será tratado para normalizar e default 'outro'
  "Acabamento": "binding", // Será tratado para normalizar e default 'outro'
  "Desconto(%)": "price.discount", // Será tratado para extrair percentual
  "Assunto": "category", // Será tratado (assume string única -> array)
  "Localização": "label",
  // Colunas da planilha que serão ignoradas por não estarem no mapping:
  // Estante*, Tipodepublicação:Revista/Livro*, EdiçãoNúmero, Número, Volume,
  // Conservaçãodeusados:*, Outrosdiferenciais:*, ID
};

/**
 * Normaliza e valida/mapeia valores de string para os Enums definidos no schema.
 * Atualizado para Idioma e Binding: Default 'outro' para valores não reconhecidos/vazios.
 * @param value Valor lido da célula.
 * @param type O tipo de enum a ser validado ('condition', 'binding', 'language').
 * @returns O valor normalizado e validado (lowercase), 'outro' para binding/language não reconhecido/vazio, ou undefined se inválido para outros tipos.
 */
const normalizeAndValidateEnum = (
  value: any,
  type: "condition" | "binding" | "language"
): string | undefined => {
  // Retorna 'outro' ou undefined se valor inicial for null/undefined
  if (value === undefined || value === null) {
    return type === "binding" || type === "language" ? "outro" : undefined;
  }

  const str = String(value).trim().toLowerCase();
  // Retorna 'outro' ou undefined se for string vazia após trim
  if (str === "") {
    return type === "binding" || type === "language" ? "outro" : undefined;
  }

  // Lógica de mapeamento e validação
  switch (type) {
    case "condition":
      if (str === "novo") return "novo";
      if (str === "usado") return "usado";
      return undefined; // Condição inválida

    case "binding":
      if (str === "brochura") return "brochura";
      if (str === "capa dura" || str === "capadura") return "capa dura";
      if (str === "espiral") return "espiral";
      // Qualquer outro valor não vazio vira 'outro'
      return "outro";

    case "language":
      if (str === "português" || str === "portugues") return "português";
      if (str === "inglês" || str === "ingles") return "inglês";
      if (str === "espanhol") return "espanhol";
      if (str === "outro") return "outro"; // Aceita 'outro' literal
      // Qualquer outro valor não vazio vira 'outro'
      return "outro";
  }
};

/**
 * Extrai o SKU e a descrição da coluna "Conservação:Descrição*".
 * @param text Conteúdo da célula.
 * @returns Objeto com sku e description extraídos.
 */
const extractSkuAndDescription = (
  text: string | undefined
): {sku?: string; description?: string} => {
  if (!text) return {};
  const textStr = String(text);
  let sku: string | undefined = undefined;
  let description: string | undefined = textStr;

  // Regex para encontrar SKU: seguido de caracteres (exceto espaço/vírgula/ponto)
  const skuMatch = textStr.match(/SKU:?\s*([^\s,.]+)/i);
  if (skuMatch && skuMatch[1]) {
    sku = skuMatch[1].trim();
    // Remove a parte do SKU da descrição
    description = textStr
      .replace(skuMatch[0], "")
      .replace(/^[,.\s]+/, "")
      .trim();
  }
  return {sku, description: description || undefined}; // Retorna undefined se descrição ficar vazia
};

// ========================================================================

export function ExcelUpload({onUploadSuccess}: {onUploadSuccess: () => void}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Manipulador para seleção de arquivo
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      // Valida extensão
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast.error("Formato inválido", {
          description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls).",
        });
        event.target.value = ""; // Limpa o input
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  // Função principal para processar e enviar os dados
  const processAndSendData = async () => {
    if (!selectedFile) {
      toast.warning("Nenhum arquivo selecionado.");
      return;
    }

    setIsProcessing(true);
    toast.info("Iniciando processamento da planilha...");
    const reader = new FileReader();

    reader.onload = async e => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Não foi possível ler o arquivo.");

        // Lê o arquivo Excel
        const workbook = XLSX.read(data, {type: "array", cellDates: true});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {header: 1});

        if (jsonData.length < 2) {
          throw new Error("Planilha vazia ou sem cabeçalho válido.");
        }

        // Extrai cabeçalhos
        const headers = jsonData[0].map((h: any) => String(h).trim());
        // Log para verificar headers lidos (pode comentar/remover depois)
        console.log("Cabeçalhos lidos:", headers);

        const booksData: Partial<IBook>[] = [];
        const errorsInFile: string[] = [];

        // Itera sobre as linhas de dados
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (
            !row ||
            row.every(
              (cell: any) => cell === undefined || cell === null || cell === ""
            )
          ) {
            continue; // Pula linha vazia
          }

          // Inicializa objeto 'book'
          const book: Partial<IBook> = {
            price: {cost: 0}, // Custo padrão 0
            stock: {own: 0, consigned: 0},
          };
          let missingOrInvalidFields: string[] = []; // Erros da linha

          // Itera sobre as colunas da linha
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            const mappedKey = COLUMN_MAPPING[header];
            let cellValue = row[j];

            if (!mappedKey) continue; // Pula coluna não mapeada

            // Guarda o valor processado (trim se for string)
            const processedCellValue =
              typeof cellValue === "string" ? cellValue.trim() : cellValue;

            // Tratamento especial SKU/Descrição
            if (mappedKey === "extractSkuAndDescription") {
              const {sku, description} =
                extractSkuAndDescription(processedCellValue);
              if (sku) book.sku = sku;
              // Atribui descrição APENAS se ela não foi preenchida ainda (evita sobrescrever)
              if (description && !book.description) {
                book.description = description;
              }
              continue; // Coluna processada
            }

            // Processa apenas se tiver algum valor real (não undefined/null)
            // String vazia '' será tratada dentro do switch/validators se necessário
            if (
              processedCellValue !== undefined &&
              processedCellValue !== null
            ) {
              try {
                switch (mappedKey) {
                  case "category":
                    // Só atribui se não for string vazia
                    if (processedCellValue !== "")
                      book.category = [String(processedCellValue)];
                    break;
                  case "year":
                  case "weight":
                    // Só processa se não for string vazia
                    if (processedCellValue !== "") {
                      const numInt = Number(processedCellValue);
                      if (isNaN(numInt)) throw new Error("Número inválido");
                      book[mappedKey as "year" | "weight"] = Math.floor(numInt);
                    }
                    break;
                  case "price.sale":
                    if (processedCellValue !== "") {
                      let numStr = String(processedCellValue)
                        .replace("R$", "")
                        .replace(/\./g, "")
                        .replace(",", ".")
                        .trim();
                      const numSale = parseFloat(numStr);
                      if (isNaN(numSale)) throw new Error("Valor inválido");
                      book.price = {...book.price, sale: numSale};
                    }
                    break;
                  case "price.discount":
                    if (processedCellValue !== "") {
                      let discStr = String(processedCellValue)
                        .replace("%", "")
                        .trim();
                      const discNum = parseFloat(discStr);
                      if (!isNaN(discNum)) {
                        book.price = {
                          ...book.price,
                          discount: {type: "percentage", value: discNum},
                        };
                      }
                    }
                    break;
                  case "condition":
                    const normCond = normalizeAndValidateEnum(
                      processedCellValue,
                      "condition"
                    );
                    if (!normCond)
                      throw new Error("Valor inválido ou vazio (Novo/Usado)");
                    book.condition = normCond as CondicaoLivro;
                    break;
                  case "language":
                    const normLang = normalizeAndValidateEnum(
                      processedCellValue,
                      "language"
                    );
                    // Garante atribuição de 'outro' se função retornar undefined (embora não deva mais)
                    book.language = (normLang || "outro") as IdiomaLivro;
                    break;
                  case "binding":
                    const normBind = normalizeAndValidateEnum(
                      processedCellValue,
                      "binding"
                    );
                    // Garante atribuição de 'outro' se função retornar undefined (embora não deva mais)
                    book.binding = (normBind || "outro") as AcabamentoLivro;
                    break;
                  case "isbn":
                    const isbnValue = String(processedCellValue);
                    // SÓ atribui o ISBN se ele NÃO for uma string vazia
                    if (isbnValue !== "") {
                      book.isbn = isbnValue;
                    }
                    // Se for vazia, book.isbn permanece undefined
                    break;
                  default: // author, title, publisher, label
                    if (!String(mappedKey).includes(".")) {
                      // Atribui mesmo se for string vazia, validação final pega se for obrigatório no schema
                      book[
                        mappedKey as keyof Omit<
                          IBook,
                          | "_id"
                          | "id"
                          | "price"
                          | "stock"
                          | "metadata"
                          | "createdAt"
                          | "updatedAt"
                        >
                      ] = String(processedCellValue) as any;
                    }
                }
              } catch (validationError: any) {
                missingOrInvalidFields.push(
                  `${header}: ${validationError.message}`
                );
              }
            }
            // Fim do if processedCellValue não é undefined/null
          } // Fim do loop das colunas (j)

          // --- Validação Final da Linha (Campos Obrigatórios do SCHEMA) ---
          // Garante que binding e language tenham 'outro' se por algum motivo ficaram undefined
          // (Ex: falha no mapeamento do header)
          if (!book.binding) book.binding = "outro";
          if (!book.language) book.language = "outro";

          // Lista de campos REALMENTE obrigatórios conforme o Schema Mongoose para uma linha ser válida
          const requiredSchemaFields: {key: keyof IBook; label: string}[] = [
            {key: "title", label: "Título*"},
            {key: "author", label: "Autor*"},
            {key: "publisher", label: "Editora*"},
            {key: "year", label: "Ano*"}, // Ano foi tornado opcional no schema, mas pode ser exigido aqui se desejado
            {key: "condition", label: "Tipo:Novo/Usado*"},
            {key: "sku", label: "SKU (extraído)"},
            {key: "binding", label: "Acabamento"},
            {key: "language", label: "Idioma"},
            // { key: 'isbn', label: 'ISBN/ISSN' }, // Mantido opcional na validação frontend
          ];
          // Adiciona validação de Preço de Venda
          if (!(book.price?.sale && book.price.sale > 0)) {
            requiredSchemaFields.push({key: "price", label: "Preço*"});
          }

          // Verifica cada campo obrigatório
          for (const field of requiredSchemaFields) {
            const valueToCheck =
              field.key === "price" ? book.price?.sale : book[field.key];
            if (
              valueToCheck === undefined ||
              valueToCheck === null ||
              String(valueToCheck).trim() === ""
            ) {
              // Checa string vazia também
              if (
                !missingOrInvalidFields.some(err =>
                  err.startsWith(field.label.split(":")[0])
                )
              ) {
                missingOrInvalidFields.push(
                  `${field.label}: Campo obrigatório não preenchido ou inválido`
                );
              }
            }
          }

          // Guarda erro ou livro válido
          if (missingOrInvalidFields.length > 0) {
            errorsInFile.push(
              `Linha ${i + 1}: ${missingOrInvalidFields.join("; ")}`
            );
          } else {
            booksData.push(book);
          }
        } // Fim do loop das linhas (i)

        // --- Finalização ---
        if (errorsInFile.length > 0) {
          console.warn("Erros encontrados na validação:", errorsInFile);
          const maxErrorsToShow = 5;
          const partialErrors = errorsInFile
            .slice(0, maxErrorsToShow)
            .join("\n");
          toast.warning(`Problemas em ${errorsInFile.length} linhas`, {
            description: `Erros impediram a importação. ${
              errorsInFile.length > maxErrorsToShow ? `(...)` : ""
            }\n${partialErrors}\n\nVerifique o console (F12) para detalhes.`,
            duration: 20000,
            style: {
              whiteSpace: "pre-line",
              maxHeight: "300px",
              overflowY: "auto",
            },
          });
          throw new Error("Erros de validação na planilha impediram o envio.");
        }

        if (booksData.length === 0) {
          throw new Error(
            "Nenhum livro válido encontrado na planilha para importação após validação."
          );
        }

        // Envia para API...
        toast.info(`Enviando ${booksData.length} livros válidos...`);
        const response = await fetch("/api/books/import", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({books: booksData}),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.message || `Erro ${response.status} na API ao importar.`
          );
        }
        toast.success("Importação Concluída!", {
          description: `${result.insertedCount || 0} livros processados. ${
            result.errorsCount || 0
          } erros no servidor.`,
        });
        onUploadSuccess();
      } catch (error: any) {
        console.error("Erro detalhado ao processar planilha:", error);
        toast.error("Erro na Importação", {
          description:
            error.message || "Não foi possível processar o arquivo Excel.",
        });
      } finally {
        setIsProcessing(false);
        setSelectedFile(null);
        const fileInput = document.getElementById(
          "excel-file-input"
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Erro de Leitura", {
        description: "Não foi possível ler o arquivo selecionado.",
      });
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(selectedFile); // Inicia leitura
  };

  // Renderiza o componente
  return (
    <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 p-4 border rounded-md bg-card shadow-sm">
      <Input
        id="excel-file-input"
        type="file"
        accept=".xlsx, .xls"
        onChange={handleFileChange}
        disabled={isProcessing}
        className="flex-1 w-full sm:w-auto"
      />
      <Button
        onClick={processAndSendData}
        disabled={!selectedFile || isProcessing}
        className="w-full sm:w-auto"
      >
        {isProcessing ? "Processando..." : "Importar Planilha"}
      </Button>
    </div>
  );
}
