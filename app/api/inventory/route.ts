// app/api/inventory/route.ts (Trecho Modificado)
import mongoose from "mongoose";
import {NextResponse} from "next/server";
import dbConnect from "@/lib/db/dbConnect";
import {InventoryItem, IInventoryItem} from "@/lib/models/inventoryItem.model";
import {BookMetadata} from "@/lib/models/bookMetadata.model";
// Importa o necessário do Next-Auth e suas opções de config
import {getServerSession} from "next-auth/next";
import {authOptions} from "../auth/[...nextauth]/route"; // Ajuste o caminho para suas authOptions

async function getUserSessionData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    // Verifica se há sessão e ID do usuário
    console.log("Nenhuma sessão encontrada ou usuário sem ID");
    return null;
  }
  // Acessa os dados que adicionamos no callback da sessão
  const userId = (session.user as any).id;
  const tenantId = (session.user as any).activeTenantId; // Pega o tenant ativo do token/sessão

  console.log(`Sessão encontrada: UserID=${userId}, TenantID=${tenantId}`);

  if (!tenantId) {
    console.log(
      "Tenant ativo não encontrado na sessão para o usuário:",
      userId
    );
    // Você pode querer lançar um erro aqui ou ter uma lógica para lidar com isso
  }

  return {userId, tenantId};
}

export async function GET(request: Request) {
  const sessionData = await getUserSessionData();

  if (!sessionData?.tenantId) {
    // Verifica se temos o tenantId
    return NextResponse.json(
      {message: "Não autorizado ou tenant não selecionado."},
      {status: 401}
    );
  }
  const {tenantId} = sessionData; // Pega o tenantId validado

  // ... resto da lógica do GET usando tenantId ...
  const {searchParams} = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  // ... (lógica de paginação, filtros, sort) ...
  let query: mongoose.FilterQuery<IInventoryItem> = {tenant: tenantId}; // Filtra pelo tenantId!
  // ...
  try {
    await dbConnect();
    const items = await InventoryItem.find(
      query
    ) /* ... populate, sort, skip, limit ... */
      .lean();
    const totalItems = await InventoryItem.countDocuments(query);
    // ... retornar resposta ...
    return NextResponse.json(
      {
        data: items,
        pagination: {
          /*...*/
        },
      },
      {status: 200}
    );
  } catch (error) {
    /* ... tratamento de erro ... */
  }
}

export async function POST(request: Request) {
  const sessionData = await getUserSessionData();

  if (!sessionData?.userId || !sessionData?.tenantId) {
    // Verifica userId e tenantId
    return NextResponse.json(
      {message: "Não autorizado ou tenant não selecionado."},
      {status: 401}
    );
  }
  const {userId, tenantId} = sessionData;

  try {
    await dbConnect();
    const body = await request.json();
    const {sku, condition, price, stock, bookMetadataId, ...otherData} = body;

    if (!sku || !condition || !price?.sale || !bookMetadataId) {
      /* ... erro 400 ... */
    }

    const bookMetaExists = await BookMetadata.findById(bookMetadataId).lean();
    if (!bookMetaExists) {
      /* ... erro 404 ... */
    }

    const newItemData: Partial<IInventoryItem> = {
      ...otherData,
      tenant: tenantId, // USA O TENANT ID DA SESSÃO
      bookMetadata: bookMetadataId,
      sku: sku.trim(),
      condition: condition,
      price: {
        /* ... */
      },
      stock: {
        /* ... */
      },
      addedBy: userId, // USA O USER ID DA SESSÃO
      status: "available",
    };

    const newItem = new InventoryItem(newItemData);
    await newItem.save();
    // ... (populate e retorno 201) ...
    const populatedItem = await InventoryItem.findById(newItem._id)
      .populate([] /*...*/)
      .lean();
    return NextResponse.json({data: populatedItem}, {status: 201});
  } catch (error: any) {
    // ... (tratamento de erro, incluindo duplicidade de SKU por tenant) ...
    if (error.code === 11000 && error.message.includes("tenant_1_sku_1")) {
      /*...*/
    }
    if (error.name === "ValidationError") {
      /*...*/
    }
    return NextResponse.json(
      {message: "Erro interno do servidor."},
      {status: 500}
    );
  }
}
