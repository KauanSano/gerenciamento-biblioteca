// app/api/inventory/route.ts
import mongoose from "mongoose";
import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import {InventoryItem, IInventoryItem} from "@/lib/models/inventoryItem.model"; // Modelo atualizado
import {getServerSession} from "next-auth/next";
import {authOptions} from "@/app/api/auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";
import {Writable} from "stream";

// Helper para obter dados da sessão (mantido)
async function getUserSessionData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    console.log("API /api/inventory: Nenhuma sessão ou ID de usuário.");
    return null;
  }
  const userData = session.user as any;
  return {
    userId: userData.id,
    tenantId: userData.activeTenantId || null,
  };
}

// Não precisamos mais do config para bodyParser: false com request.formData()
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

/**
 * GET /api/inventory
 * Lista os itens de inventário para o tenant ativo.
 */
export async function GET(request: Request) {
  const sessionData = await getUserSessionData();

  if (!sessionData?.tenantId) {
    return NextResponse.json(
      {message: "Não autorizado ou tenant não selecionado."},
      {status: 401}
    );
  }
  const {tenantId} = sessionData;

  const {searchParams} = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);
  const skip = (page - 1) * limit;
  const sortOptions: any = {createdAt: -1}; // Default sort

  const globalSearchTerm = searchParams.get("search")?.trim();
  let query: mongoose.FilterQuery<IInventoryItem> = {tenant: tenantId};

  if (globalSearchTerm) {
    const searchRegex = {$regex: globalSearchTerm, $options: "i"};
    // Agora busca diretamente nos campos do InventoryItem
    query.$or = [
      {sku: searchRegex},
      {label: searchRegex},
      {title: searchRegex},
      {isbn: searchRegex},
      {authors: searchRegex}, // Se authors for um array de strings, a busca regex funciona
      {publisher: searchRegex},
    ];
  }

  try {
    await dbConnect();

    const items = await InventoryItem.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalItems = await InventoryItem.countDocuments(query);

    if (items.length > 0) {
      console.log(
        "Primeiro item retornado pela API GET /api/inventory:",
        JSON.stringify(items[0], null, 2)
      );
    }

    return NextResponse.json(
      {
        data: items,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems: totalItems,
          itemsPerPage: limit,
        },
      },
      {status: 200}
    );
  } catch (error: any) {
    console.error(
      `Erro ao listar inventário para tenant ${tenantId} com filtro "${globalSearchTerm}":`,
      error
    );
    return NextResponse.json(
      {message: "Erro interno do servidor ao buscar inventário."},
      {status: 500}
    );
  }
}

/**
 * POST /api/inventory
 * Cria um novo item de inventário, lidando com upload de imagem nativamente.
 */
export async function POST(request: Request) {
  const sessionData = await getUserSessionData();
  if (!sessionData?.userId || !sessionData?.tenantId) {
    return NextResponse.json(
      {message: "Não autorizado ou tenant não selecionado."},
      {status: 401}
    );
  }
  const {userId, tenantId} = sessionData;

  try {
    await dbConnect();

    const formData = await request.formData(); // Processa FormData nativamente

    // Extrai campos de texto
    const getStringField = (fieldName: string): string | undefined =>
      formData.get(fieldName)?.toString().trim();
    const getNumberField = (fieldName: string): number | undefined => {
      const val = formData.get(fieldName)?.toString().trim();
      return val ? parseFloat(val) : undefined;
    };
    const getIntField = (fieldName: string): number | undefined => {
      const val = formData.get(fieldName)?.toString().trim();
      return val ? parseInt(val, 10) : undefined;
    };

    const sku = getStringField("sku");
    const title = getStringField("title");
    const condition = getStringField(
      "condition"
    ) as IInventoryItem["condition"];
    const salePrice = getNumberField("salePrice");

    if (!sku || !title || !condition || salePrice === undefined) {
      return NextResponse.json(
        {
          message:
            "Campos obrigatórios faltando (SKU, Título, Condição, Preço de Venda).",
        },
        {status: 400}
      );
    }

    const newItemData: Partial<IInventoryItem> = {
      tenant: tenantId,
      sku: sku,
      title: title,
      authors: formData.getAll("authors[]").map(String).filter(Boolean), // Se 'authors[]' for enviado
      publisher: getStringField("publisher"),
      year: getIntField("year"),
      isbn: getStringField("isbn"),
      description: getStringField("description"),
      condition: condition,
      price: {
        sale: salePrice,
        cost: getNumberField("costPrice") ?? 0,
      },
      stock: {
        own: getIntField("stockOwn") ?? 1,
        consigned: getIntField("stock.consigned") ?? 0,
      },
      binding:
        (getStringField("binding") as IInventoryItem["binding"]) || "outro",
      language:
        (getStringField("language") as IInventoryItem["language"]) ||
        "português",
      itemSpecificDescription: getStringField("itemSpecificDescription"),
      label: getStringField("label"),
      subjects: formData.getAll("subjects[]").map(String).filter(Boolean), // Se 'subjects[]' for enviado
      addedBy: userId,
      status: "available",
    };

    // Processa o campo de desconto se enviado
    const discountValue = getNumberField("discount.value");
    const discountType = getStringField("discount.type") as
      | "percentage"
      | "fixed"
      | undefined;
    if (discountValue !== undefined && discountType && newItemData.price) {
      newItemData.price.discount = {type: discountType, value: discountValue};
    }

    // Processa o upload da imagem
    const imageFile = formData.get("coverImageFile") as File | null;
    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > 5 * 1024 * 1024) {
        // Limite de 5MB
        return NextResponse.json(
          {message: "Arquivo de imagem muito grande (limite: 5MB)."},
          {status: 413}
        );
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
        return NextResponse.json(
          {
            message:
              "Tipo de arquivo de imagem inválido (permitido: JPEG, PNG, WebP).",
          },
          {status: 415}
        );
      }

      const fileExtension = path.extname(imageFile.name);
      const uniqueFilename = `cover-${tenantId}-${Date.now()}${fileExtension}`;
      const uploadDir = path.join(process.cwd(), "public", "uploads", "covers");
      const filePath = path.join(uploadDir, uniqueFilename);

      // Garante que o diretório de upload exista
      await fs.mkdir(uploadDir, {recursive: true});

      // Salva o arquivo
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      await fs.writeFile(filePath, buffer);

      newItemData.coverImageUrl = `/uploads/covers/${uniqueFilename}`;
      console.log(`Imagem da capa salva em: ${newItemData.coverImageUrl}`);
    } else if (getStringField("coverImageUrlDisplay")) {
      // Se não houve upload, mas uma URL de capa da API do Google foi enviada, usa ela
      newItemData.coverImageUrl = getStringField("coverImageUrlDisplay");
    }

    const newItem = new InventoryItem(newItemData);
    await newItem.save();

    return NextResponse.json({data: newItem.toObject()}, {status: 201});
  } catch (error: any) {
    console.error(
      `Erro ao criar item (FormData) para tenant ${tenantId}:`,
      error
    );
    if (error.code === 11000 && error.message.includes("tenant_1_sku_1")) {
      // Índice composto
      return NextResponse.json(
        {
          message: `Erro: SKU '${error.keyValue?.sku}' já existe para esta loja.`,
        },
        {status: 409}
      );
    }
    if (error.name === "ValidationError") {
      return NextResponse.json(
        {message: "Erro de validação:", errors: error.errors},
        {status: 400}
      );
    }

    return NextResponse.json(
      {message: error.message || "Erro interno do servidor ao criar item."},
      {status: 500}
    );
  }
}
