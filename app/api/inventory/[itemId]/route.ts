// app/api/inventory/[itemId]/route.ts
import {NextResponse} from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/dbConnect";
import {
  InventoryItem,
  IInventoryItem,
  CondicaoLivro,
  AcabamentoLivro,
  IdiomaLivro,
} from "@/lib/models/inventoryItem.model";
import {BookMetadata} from "@/lib/models/bookMetadata.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@/app/api/auth/[...nextauth]/route";
import formidable from "formidable";
import fs from "fs/promises";
import path from "path";

// Helper para obter dados da sessão (reutilizado)
async function getUserSessionData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const userData = session.user as any;
  return {
    userId: userData.id,
    tenantId: userData.activeTenantId || null,
  };
}

interface RouteParams {
  params: {
    itemId: string; // Nome do parâmetro definido pela pasta [itemId]
  };
}

// Configuração para formidable (apenas se PUT for lidar com uploads de imagem)
// Se PUT só lida com JSON, isso pode ser removido ou ajustado.
export const config = {
  api: {
    bodyParser: false, // Necessário para formidable processar FormData
  },
};

/**
 * GET /api/inventory/{itemId}
 * Busca um item de inventário específico pelo seu ID.
 */
export async function GET(request: Request, {params}: RouteParams) {
  const sessionData = await getUserSessionData();
  const {itemId} = params;

  if (!sessionData?.userId || !sessionData?.tenantId) {
    return NextResponse.json(
      {message: "Não autorizado ou tenant não selecionado."},
      {status: 401}
    );
  }
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return NextResponse.json({message: "ID do item inválido."}, {status: 400});
  }
  const {tenantId} = sessionData;

  try {
    await dbConnect();
    const item = await InventoryItem.findOne({_id: itemId, tenant: tenantId})
      .populate<{bookMetadata: typeof BookMetadata}>({
        // Exemplo de populate, ajuste conforme necessário
        path: "bookMetadata", // Se você não tem mais BookMetadata, remova ou ajuste
        select: "title authors isbn", // Campos que você quer do BookMetadata
      })
      .lean();

    if (!item) {
      return NextResponse.json(
        {
          message:
            "Item de inventário não encontrado ou não pertence à sua loja.",
        },
        {status: 404}
      );
    }
    return NextResponse.json({data: item}, {status: 200});
  } catch (error: any) {
    console.error(
      `Erro ao buscar item ${itemId} para tenant ${tenantId}:`,
      error
    );
    if (error.name === "CastError") {
      return NextResponse.json(
        {message: "ID do item com formato inválido."},
        {status: 400}
      );
    }
    return NextResponse.json(
      {message: "Erro interno do servidor ao buscar item."},
      {status: 500}
    );
  }
}

/**
 * PUT /api/inventory/{itemId}
 * Atualiza um item de inventário específico.
 * Esta versão lida com FormData para permitir atualização de imagem.
 * Se não houver atualização de imagem, o frontend pode enviar JSON.
 */
export async function PUT(request: Request, {params}: RouteParams) {
  const sessionData = await getUserSessionData();
  const {itemId} = params;

  if (!sessionData?.userId || !sessionData?.tenantId) {
    return NextResponse.json(
      {message: "Não autorizado ou tenant não selecionado."},
      {status: 401}
    );
  }
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return NextResponse.json({message: "ID do item inválido."}, {status: 400});
  }
  const {tenantId, userId} = sessionData;

  try {
    await dbConnect();

    const contentType = request.headers.get("content-type") || "";
    let updateData: Partial<IInventoryItem> = {};
    let newCoverImagePath: string | undefined = undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = formidable({
        uploadDir: path.join(process.cwd(), "public", "uploads", "covers"),
        keepExtensions: true,
        filename: (name, ext) => `cover-${tenantId}-${Date.now()}${ext}`,
        maxFileSize: 5 * 1024 * 1024,
        filter: ({mimetype}) =>
          !!(
            mimetype &&
            mimetype.includes("image") &&
            (mimetype.includes("jpeg") ||
              mimetype.includes("png") ||
              mimetype.includes("webp"))
          ),
      });

      const [fields, files] = await new Promise<
        [formidable.Fields, formidable.Files]
      >((resolve, reject) => {
        form.parse(request as any, (err, fields, files) => {
          if (err) {
            reject(err);
            return;
          }
          resolve([fields, files]);
        });
      });

      // Mapeia campos de 'fields' para 'updateData'
      // Os valores em 'fields' são arrays, pegamos o primeiro elemento.
      const getStringField = (fieldName: string): string | undefined =>
        fields[fieldName]?.[0];
      const getNumberField = (fieldName: string): number | undefined =>
        fields[fieldName]?.[0] ? parseFloat(fields[fieldName]![0]) : undefined;
      const getIntField = (fieldName: string): number | undefined =>
        fields[fieldName]?.[0]
          ? parseInt(fields[fieldName]![0], 10)
          : undefined;
      const getBooleanField = (fieldName: string): boolean | undefined =>
        fields[fieldName]?.[0]
          ? fields[fieldName]![0].toLowerCase() === "true"
          : undefined;

      // Campos de metadados do livro (direto no InventoryItem)
      if (getStringField("title")) updateData.title = getStringField("title");
      if (fields.authors)
        updateData.authors = Array.isArray(fields.authors)
          ? fields.authors
          : [fields.authors as string];
      if (getStringField("publisher"))
        updateData.publisher = getStringField("publisher");
      if (getIntField("year") !== undefined)
        updateData.year = getIntField("year");
      if (getStringField("isbn")) updateData.isbn = getStringField("isbn");
      if (getStringField("description"))
        updateData.description = getStringField("description");
      if (fields.subjects)
        updateData.subjects = Array.isArray(fields.subjects)
          ? fields.subjects
          : [fields.subjects as string];

      // Campos específicos do exemplar
      if (getStringField("condition"))
        updateData.condition = getStringField("condition") as CondicaoLivro;
      if (getStringField("binding"))
        updateData.binding = getStringField("binding") as AcabamentoLivro;
      if (getStringField("language"))
        updateData.language = getStringField("language") as IdiomaLivro;
      if (getStringField("itemSpecificDescription"))
        updateData.itemSpecificDescription = getStringField(
          "itemSpecificDescription"
        );
      if (getStringField("label")) updateData.label = getStringField("label");
      if (getBooleanField("isResale") !== undefined)
        updateData.isResale = getBooleanField("isResale");
      if (getStringField("status"))
        updateData.status = getStringField(
          "status"
        ) as IInventoryItem["status"];

      // Preço
      const salePrice = getNumberField("price.sale");
      const costPrice = getNumberField("price.cost");
      if (salePrice !== undefined || costPrice !== undefined) {
        updateData.price = {
          ...((await InventoryItem.findById(itemId).select("price").lean())
            ?.price || {}),
        }; // Mantém valores existentes
        if (salePrice !== undefined) updateData.price.sale = salePrice;
        if (costPrice !== undefined) updateData.price.cost = costPrice;
        // Lógica para desconto pode ser adicionada aqui
      }

      // Estoque
      const stockOwn = getIntField("stock.own");
      const stockConsigned = getIntField("stock.consigned");
      if (stockOwn !== undefined || stockConsigned !== undefined) {
        updateData.stock = {
          ...((await InventoryItem.findById(itemId).select("stock").lean())
            ?.stock || {}),
        };
        if (stockOwn !== undefined) updateData.stock.own = stockOwn;
        if (stockConsigned !== undefined)
          updateData.stock.consigned = stockConsigned;
      }

      // Processa nova imagem da capa, se enviada
      if (
        files.coverImageFile &&
        Array.isArray(files.coverImageFile) &&
        files.coverImageFile[0]
      ) {
        const uploadedFile = files.coverImageFile[0];
        newCoverImagePath = `/uploads/covers/${uploadedFile.newFilename}`;
        updateData.coverImageUrl = newCoverImagePath;

        // Opcional: Excluir imagem antiga se uma nova for enviada
        const oldItem = await InventoryItem.findById(itemId)
          .select("coverImageUrl")
          .lean();
        if (
          oldItem?.coverImageUrl &&
          oldItem.coverImageUrl !== newCoverImagePath
        ) {
          const oldPath = path.join(
            process.cwd(),
            "public",
            oldItem.coverImageUrl
          );
          fs.unlink(oldPath).catch(err =>
            console.warn(`Falha ao excluir imagem antiga ${oldPath}:`, err)
          );
        }
      } else if (
        getStringField("coverImageUrl") === "" ||
        getStringField("removeCoverImage") === "true"
      ) {
        // Se coverImageUrl for enviado como string vazia ou um campo 'removeCoverImage' for true, remove a imagem
        const oldItem = await InventoryItem.findById(itemId)
          .select("coverImageUrl")
          .lean();
        if (oldItem?.coverImageUrl) {
          const oldPath = path.join(
            process.cwd(),
            "public",
            oldItem.coverImageUrl
          );
          fs.unlink(oldPath).catch(err =>
            console.warn(`Falha ao excluir imagem antiga ${oldPath}:`, err)
          );
        }
        updateData.coverImageUrl = ""; // Define como vazio ou null
      }
      // Se 'coverImageUrlDisplay' for enviado e não houver 'coverImageFile',
      // e não for para remover, não fazemos nada (mantém a URL existente ou a da API do Google)
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      // Sanitiza o body para permitir apenas campos atualizáveis
      const {
        tenant,
        sku,
        bookMetadata,
        addedBy,
        createdAt,
        updatedAt,
        ...allowedUpdates
      } = body;
      updateData = allowedUpdates;
      // Se o frontend enviar coverImageUrl como string vazia para remover
      if (body.hasOwnProperty("coverImageUrl") && body.coverImageUrl === "") {
        const oldItem = await InventoryItem.findById(itemId)
          .select("coverImageUrl")
          .lean();
        if (oldItem?.coverImageUrl) {
          const oldPath = path.join(
            process.cwd(),
            "public",
            oldItem.coverImageUrl
          );
          fs.unlink(oldPath).catch(err =>
            console.warn(`Falha ao excluir imagem antiga ${oldPath}:`, err)
          );
        }
        updateData.coverImageUrl = "";
      }
    } else {
      return NextResponse.json(
        {message: "Content-Type não suportado."},
        {status: 415}
      );
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {message: "Nenhum campo válido para atualização fornecido."},
        {status: 400}
      );
    }

    // Adiciona o ID do usuário que modificou (se tiver um campo metadata.lastModifiedBy)
    // updateData['metadata.lastModifiedBy'] = userId; // Exemplo

    const updatedItem = await InventoryItem.findOneAndUpdate(
      {_id: itemId, tenant: tenantId},
      {$set: updateData},
      {new: true, runValidators: true}
    ).lean();

    if (!updatedItem) {
      // Se um novo arquivo foi salvo mas o item não foi encontrado/atualizado, remove o arquivo órfão
      if (newCoverImagePath) {
        await fs
          .unlink(path.join(process.cwd(), "public", newCoverImagePath))
          .catch(console.error);
      }
      return NextResponse.json(
        {
          message:
            "Item de inventário não encontrado ou não pertence à sua loja.",
        },
        {status: 404}
      );
    }

    return NextResponse.json({data: updatedItem}, {status: 200});
  } catch (error: any) {
    console.error(
      `Erro ao atualizar item ${itemId} para tenant ${tenantId}:`,
      error
    );
    if (error.name === "ValidationError") {
      return NextResponse.json(
        {message: "Erro de validação Mongoose.", errors: error.errors},
        {status: 400}
      );
    }
    if (error.name === "CastError") {
      return NextResponse.json(
        {message: "ID do item ou dado com formato inválido."},
        {status: 400}
      );
    }
    if (
      error instanceof formidable.errors.FormidableError &&
      error.code === 1009
    ) {
      return NextResponse.json(
        {message: `Erro: Arquivo de imagem muito grande.`},
        {status: 413}
      );
    }
    return NextResponse.json(
      {message: "Erro interno do servidor ao atualizar item."},
      {status: 500}
    );
  }
}

/**
 * DELETE /api/inventory/{itemId}
 * Exclui um item de inventário específico.
 */
export async function DELETE(request: Request, {params}: RouteParams) {
  const sessionData = await getUserSessionData();
  const {itemId} = params;

  if (!sessionData?.userId || !sessionData?.tenantId) {
    return NextResponse.json({message: "Não autorizado."}, {status: 401});
  }
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return NextResponse.json({message: "ID do item inválido."}, {status: 400});
  }
  const {tenantId} = sessionData;

  try {
    await dbConnect();

    // Encontra o item ANTES de deletar para pegar o caminho da imagem, se houver
    const itemToDelete = await InventoryItem.findOne({
      _id: itemId,
      tenant: tenantId,
    })
      .select("coverImageUrl")
      .lean();

    if (!itemToDelete) {
      return NextResponse.json(
        {
          message:
            "Item de inventário não encontrado ou não pertence à sua loja.",
        },
        {status: 404}
      );
    }

    // Deleta o item do banco
    await InventoryItem.deleteOne({_id: itemId, tenant: tenantId});

    // Se o item tinha uma imagem, tenta excluí-la do sistema de arquivos
    if (itemToDelete.coverImageUrl) {
      const imagePath = path.join(
        process.cwd(),
        "public",
        itemToDelete.coverImageUrl
      );
      try {
        await fs.unlink(imagePath);
        console.log(
          `Imagem ${itemToDelete.coverImageUrl} excluída do sistema de arquivos.`
        );
      } catch (unlinkError: any) {
        // Não bloqueia a resposta se a exclusão do arquivo falhar, mas loga
        console.warn(
          `Falha ao excluir arquivo de imagem ${imagePath}:`,
          unlinkError.message
        );
      }
    }

    return NextResponse.json(
      {message: "Item de inventário excluído com sucesso."},
      {status: 200}
    );
  } catch (error: any) {
    console.error(
      `Erro ao excluir item ${itemId} para tenant ${tenantId}:`,
      error
    );
    if (error.name === "CastError") {
      return NextResponse.json(
        {message: "ID do item com formato inválido."},
        {status: 400}
      );
    }
    return NextResponse.json(
      {message: "Erro interno do servidor ao excluir item."},
      {status: 500}
    );
  }
}
