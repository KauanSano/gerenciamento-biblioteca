// app/api/inventory/[itemId]/route.ts
import {NextResponse} from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/dbConnect";
import {InventoryItem, IInventoryItem} from "@/lib/models/inventoryItem.model";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@/app/api/auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import {createAuditLog} from "@/lib/models/auditLog.model";

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
    itemId: string;
  };
}

/**
 * GET /api/inventory/{itemId}
 * Busca um item de inventário específico pelo seu ID.
 */
export async function GET(request: Request, {params}: RouteParams) {
  const sessionData = await getUserSessionData();
  const {itemId} = params;

  if (!sessionData?.userId || !sessionData?.tenantId) {
    return NextResponse.json({message: "Não autorizado"}, {status: 401});
  }
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return NextResponse.json({message: "ID do item inválido."}, {status: 400});
  }
  const {tenantId} = sessionData;

  try {
    await dbConnect();
    const item = await InventoryItem.findOne({
      _id: itemId,
      tenant: tenantId,
    }).lean();

    if (!item) {
      return NextResponse.json(
        {message: "Item não encontrado."},
        {status: 404}
      );
    }
    return NextResponse.json({data: item}, {status: 200});
  } catch (error: any) {
    console.error(`Erro ao buscar item ${itemId}:`, error);
    return NextResponse.json(
      {message: "Erro interno do servidor."},
      {status: 500}
    );
  }
}

/**
 * PUT /api/inventory/{itemId}
 * Atualiza um item de inventário específico.
 * CORRIGIDO para usar request.formData() nativo do Next.js.
 */
export async function PUT(request: Request, {params}: RouteParams) {
  const sessionData = await getUserSessionData();
  const {itemId} = params;

  if (!sessionData?.userId || !sessionData?.tenantId) {
    return NextResponse.json({message: "Não autorizado"}, {status: 401});
  }
  if (!itemId || !mongoose.Types.ObjectId.isValid(itemId)) {
    return NextResponse.json({message: "ID do item inválido."}, {status: 400});
  }
  const {tenantId, userId} = sessionData;

  try {
    await dbConnect();

    // Busca o item antigo para verificar a imagem e para o log de auditoria
    const oldItem = await InventoryItem.findOne({
      _id: itemId,
      tenant: tenantId,
    }).lean();
    if (!oldItem) {
      return NextResponse.json(
        {message: "Item não encontrado para atualização."},
        {status: 404}
      );
    }

    const formData = await request.formData();
    const updateData: {[key: string]: any} = {};

    // Mapeia os campos do FormData para o objeto de atualização
    for (const [key, value] of formData.entries()) {
      if (key === "coverImageFile" || key === "removeCoverImage") continue;

      // Trata campos aninhados como 'price.sale'
      if (key.includes(".")) {
        const [parent, child] = key.split(".");
        if (!updateData[parent]) updateData[parent] = {};
        updateData[parent][child] = value;
      } else if (key === "authors") {
        // Lida com múltiplos valores para 'authors'
        if (!updateData.authors) updateData.authors = [];
        updateData.authors.push(value);
      } else {
        updateData[key] = value;
      }
    }

    // Processa o upload da imagem
    const imageFile = formData.get("coverImageFile") as File | null;
    const shouldRemoveImage = formData.get("removeCoverImage") === "true";

    if (imageFile && imageFile.size > 0) {
      // Salva a nova imagem
      const fileExtension = path.extname(imageFile.name);
      const uniqueFilename = `cover-${tenantId}-${Date.now()}${fileExtension}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "covers");
      const filePath = path.join(uploadDir, uniqueFilename);
      await fs.mkdir(uploadDir, {recursive: true});
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      updateData.coverImageUrl = `/uploads/covers/${uniqueFilename}`;

      // Deleta a imagem antiga, se existir e for diferente
      if (
        oldItem.coverImageUrl &&
        oldItem.coverImageUrl !== updateData.coverImageUrl
      ) {
        await fs
          .unlink(path.join(process.cwd(), "public", oldItem.coverImageUrl))
          .catch(console.warn);
      }
    } else if (shouldRemoveImage && oldItem.coverImageUrl) {
      // Remove a imagem existente
      await fs
        .unlink(path.join(process.cwd(), "public", oldItem.coverImageUrl))
        .catch(console.warn);
      updateData.coverImageUrl = "";
    }

    const updatedItem = await InventoryItem.findByIdAndUpdate(
      itemId,
      {$set: updateData},
      {new: true, runValidators: true}
    );

    // Cria log de auditoria
    await createAuditLog(tenantId, userId, "ITEM_UPDATED", {
      itemId: updatedItem?._id,
      sku: updatedItem?.sku,
      title: updatedItem?.title,
    });

    return NextResponse.json({data: updatedItem}, {status: 200});
  } catch (error: any) {
    console.error(`Erro ao atualizar item ${itemId}:`, error);
    return NextResponse.json(
      {message: "Erro interno do servidor."},
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
  const {tenantId, userId} = sessionData;

  try {
    await dbConnect();

    const itemToDelete = await InventoryItem.findOneAndDelete({
      _id: itemId,
      tenant: tenantId,
    });

    if (!itemToDelete) {
      return NextResponse.json(
        {message: "Item não encontrado."},
        {status: 404}
      );
    }

    // Deleta a imagem se existir
    if (itemToDelete.coverImageUrl) {
      await fs
        .unlink(path.join(process.cwd(), "public", itemToDelete.coverImageUrl))
        .catch(console.warn);
    }

    // Cria log de auditoria
    await createAuditLog(tenantId, userId, "ITEM_DELETED", {
      itemId: itemToDelete._id,
      sku: itemToDelete.sku,
      title: itemToDelete.title,
    });

    return NextResponse.json(
      {message: "Item excluído com sucesso."},
      {status: 200}
    );
  } catch (error: any) {
    console.error(`Erro ao excluir item ${itemId}:`, error);
    return NextResponse.json(
      {message: "Erro interno do servidor."},
      {status: 500}
    );
  }
}
