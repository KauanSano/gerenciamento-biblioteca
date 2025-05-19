// components/ExcelUpload.tsx
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
} from "@/lib/models/bookSchema"; // Ajuste o caminho se necessário

// ========================================================================
// MAPEAMENTO DE COLUNAS E FUNÇÕES AUXILIARES
// ========================================================================

const COLUMN_MAPPING: {[key: string]: string} = {
  "ISBN/ISSN": "isbn",
  "Autor*": "author",
  "Título*": "title",
  "Editora*": "publisher",
  "Ano*": "year",
  "Preço*": "price.sale",
  "Conservação: Descrição*": "extractSkuAndDescription",
  "Peso (g)": "weight",
  "Tipo: Novo/Usado*": "condition",
  "Idioma": "language",
  "Acabamento": "binding",
  "Desconto (%)": "price.discount",
  "Assunto": "category",
  "Localização": "label",
};

const normalizeAndValidateEnum = (
  value: any,
  type: "condition" | "binding" | "language"
): string | undefined => {
  // ... (lógica inalterada da versão anterior)
  if (value === undefined || value === null) {
    return type === "binding" || type === "language" ? "outro" : undefined;
  }
  const str = String(value).trim().toLowerCase();
  if (str === "") {
    return type === "binding" || type === "language" ? "outro" : undefined;
  }
  switch (type) {
    case "condition":
      if (str === "novo") return "novo";
      if (str === "usado") return "usado";
      return undefined;
    case "binding":
      if (str === "brochura") return "brochura";
      if (str === "capa dura" || str === "capadura") return "capa dura";
      if (str === "espiral") return "espiral";
      return "outro";
    case "language":
      if (str === "português" || str === "portugues") return "português";
      if (str === "inglês" || str === "ingles") return "inglês";
      if (str === "espanhol") return "espanhol";
      if (str === "outro") return "outro";
      return "outro";
  }
};

const extractSkuAndDescription = (
  text: string | undefined
): {sku?: string; description?: string} => {
  // ... (lógica inalterada da versão anterior)
  if (!text) return {};
  const textStr = String(text);
  let sku: string | undefined = undefined;
  let description: string | undefined = textStr;
  const skuMatch = textStr.match(/SKU:?\s*([^\s,.]+)/i);
  if (skuMatch && skuMatch[1]) {
    let capturedSku = skuMatch[1].trim();
    if (capturedSku.includes(",")) {
      sku = capturedSku.split(",")[0].trim();
    } else {
      sku = capturedSku;
    }
    description = textStr
      .replace(skuMatch[0], "")
      .replace(/^[,.\s]+/, "")
      .trim();
  }
  return {sku, description: description || undefined};
};

// ========================================================================
// COMPONENTE REACT
// ========================================================================

export function ExcelUpload({onUploadSuccess}: {onUploadSuccess: () => void}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    // ... (lógica de seleção de arquivo inalterada)
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        toast.error("Formato inválido", {
          description: "Selecione .xlsx ou .xls.",
        });
        event.target.value = "";
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

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

        const workbook = XLSX.read(data, {type: "array", cellDates: true});
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, {header: 1});

        if (jsonData.length < 2)
          throw new Error("Planilha vazia ou sem cabeçalho.");

        const headers = jsonData[0].map((h: any) => String(h).trim());
        console.log("Cabeçalhos lidos (ExcelUpload):", headers);

        const booksDataFromSheet: Partial<IBook>[] = [];
        const errorsInFile: string[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (
            !row ||
            row.every(
              (cell: any) => cell === undefined || cell === null || cell === ""
            )
          )
            continue;

          const book: Partial<IBook> = {
            price: {cost: 0},
            stock: {own: 0, consigned: 0},
          };
          let missingOrInvalidFields: string[] = [];

          for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            const mappedKey = COLUMN_MAPPING[header];
            let cellValue = row[j];
            if (!mappedKey) continue;

            const processedCellValue =
              typeof cellValue === "string" ? cellValue.trim() : cellValue;

            if (mappedKey === "extractSkuAndDescription") {
              const {sku, description} =
                extractSkuAndDescription(processedCellValue);
              if (sku) book.sku = sku;
              if (description && !book.description)
                book.description = description;
              continue;
            }

            if (
              processedCellValue !== undefined &&
              processedCellValue !== null
            ) {
              try {
                switch (mappedKey) {
                  case "category":
                    if (String(processedCellValue).trim() !== "")
                      book.category = [String(processedCellValue).trim()];
                    break;
                  case "year":
                  case "weight":
                    if (String(processedCellValue).trim() !== "") {
                      const numInt = Number(processedCellValue);
                      if (isNaN(numInt)) throw new Error("Número inválido");
                      book[mappedKey as "year" | "weight"] = Math.floor(numInt);
                    }
                    break;
                  case "price.sale": // << --- LÓGICA DE PARSING DE PREÇO CORRIGIDA ---
                    if (String(processedCellValue).trim() !== "") {
                      let numStr = String(processedCellValue)
                        .replace("R$", "")
                        .trim();
                      // Se contém vírgula, assume formato pt-BR (1.234,56 ou 17,95)
                      // Remove pontos (milhar) e substitui vírgula (decimal) por ponto
                      if (numStr.includes(",")) {
                        numStr = numStr.replace(/\./g, "").replace(",", ".");
                      }
                      // Se não contém vírgula mas contém ponto (ex: 17.95), já está ok ou é inteiro
                      // Se não contém nem vírgula nem ponto, é um inteiro
                      const numSale = parseFloat(numStr);
                      if (isNaN(numSale))
                        throw new Error("Valor de preço de venda inválido");
                      book.price = {...book.price, sale: numSale}; // Salva como float
                    }
                    break;
                  case "price.discount":
                    if (String(processedCellValue).trim() !== "") {
                      let discStr = String(processedCellValue)
                        .replace("%", "")
                        .trim();
                      const discNum = parseFloat(discStr);
                      if (!isNaN(discNum))
                        book.price = {
                          ...book.price,
                          discount: {type: "percentage", value: discNum},
                        };
                    }
                    break;
                  case "condition":
                    const normCond = normalizeAndValidateEnum(
                      processedCellValue,
                      "condition"
                    );
                    if (!normCond)
                      throw new Error(
                        "Valor inválido ou vazio (esperado 'Novo' ou 'Usado')"
                      );
                    book.condition = normCond as CondicaoLivro;
                    break;
                  case "language":
                    book.language = normalizeAndValidateEnum(
                      processedCellValue,
                      "language"
                    ) as IdiomaLivro;
                    break;
                  case "binding":
                    book.binding = normalizeAndValidateEnum(
                      processedCellValue,
                      "binding"
                    ) as AcabamentoLivro;
                    break;
                  case "isbn":
                    const isbnStr = String(processedCellValue).trim();
                    if (isbnStr !== "") book.isbn = isbnStr;
                    break;
                  default:
                    if (!String(mappedKey).includes(".")) {
                      const defaultStr = String(processedCellValue).trim();
                      if (defaultStr !== "")
                        (book as any)[mappedKey] = defaultStr;
                    }
                }
              } catch (validationError: any) {
                missingOrInvalidFields.push(
                  `${header}: ${validationError.message}`
                );
              }
            } else {
              if (mappedKey === "language") book.language = "outro";
              else if (mappedKey === "binding") book.binding = "outro";
            }
          } // Fim loop colunas

          // Validação final dos campos OBRIGATÓRIOS
          const requiredSheetFields: {key: keyof IBook; label: string}[] = [
            {key: "title", label: "Título*"},
            {key: "author", label: "Autor*"},
            {key: "publisher", label: "Editora*"},
            {key: "year", label: "Ano*"},
            {key: "condition", label: "Tipo:Novo/Usado*"},
            {key: "sku", label: "SKU (extraído)"},
            {key: "binding", label: "Acabamento"},
            {key: "language", label: "Idioma"},
          ];
          if (!book.price?.sale) {
            // Apenas verifica se existe, não mais > 0 aqui
            requiredSheetFields.push({key: "price", label: "Preço*"});
          }
          if (!book.binding) book.binding = "outro"; // Garante default
          if (!book.language) book.language = "outro"; // Garante default

          for (const field of requiredSheetFields) {
            const valueToCheck =
              field.key === "price" ? book.price?.sale : book[field.key];
            if (
              valueToCheck === undefined ||
              valueToCheck === null ||
              String(valueToCheck).trim() === ""
            ) {
              if (
                !missingOrInvalidFields.some(err =>
                  err.startsWith(field.label.split(":")[0])
                )
              ) {
                missingOrInvalidFields.push(
                  `${field.label}: Campo obrigatório não preenchido ou inválido na planilha`
                );
              }
            }
          }

          if (missingOrInvalidFields.length > 0) {
            errorsInFile.push(
              `Linha ${i + 1} (planilha): ${missingOrInvalidFields.join("; ")}`
            );
          } else {
            booksDataFromSheet.push(book);
          }
        } // Fim loop linhas

        // ... (Resto da lógica de envio e tratamento de resposta inalterada) ...
        if (errorsInFile.length > 0) {
          console.warn(
            "Erros na validação da planilha (frontend):",
            errorsInFile
          );
          const maxErrorsToShow = 7;
          const partialErrors = errorsInFile
            .slice(0, maxErrorsToShow)
            .join("\n");
          toast.warning(
            `Problemas em ${errorsInFile.length} linhas da planilha`,
            {
              description: `Erros impediram o envio. ${
                errorsInFile.length > maxErrorsToShow
                  ? `(Mostrando os primeiros ${maxErrorsToShow})`
                  : ""
              }\n${partialErrors}\n\nVerifique o console (F12) para detalhes.`,
              duration: 25000,
              style: {
                whiteSpace: "pre-line",
                maxHeight: "350px",
                overflowY: "auto",
              },
            }
          );
          throw new Error(
            "Erros de validação na planilha (frontend) impediram o envio."
          );
        }

        if (booksDataFromSheet.length === 0)
          throw new Error(
            "Nenhum livro válido encontrado na planilha para importação."
          );

        toast.info(
          `Enviando ${booksDataFromSheet.length} registros da planilha para o servidor...`
        );
        const response = await fetch("/api/inventory/import", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({books: booksDataFromSheet}),
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.message || `Erro ${response.status} da API ao importar.`
          );
        toast.success("Importação de Inventário Concluída!", {
          description: `${result.insertedCount || 0} itens processados. ${
            result.errorsCount || 0
          } erros no servidor. Verifique o console do servidor para detalhes.`,
        });
        onUploadSuccess();
      } catch (error: any) {
        console.error("Erro ao processar/enviar planilha:", error);
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
        description: "Não foi possível ler o arquivo.",
      });
      setIsProcessing(false);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

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
