// lib/dbConnect.ts
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Por favor, defina a variável de ambiente MONGODB_URI.");
}

/**
 * Cache global para a conexão. Isso é feito para evitar
 * criar novas conexões em cada requisição com o Next.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = {conn: null, promise: null};
}

async function dbConnect() {
  if (cached.conn) {
    console.log("=> Usando conexão de banco de dados existente");
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false, // Desabilitar buffer se a conexão demorar (opcional)
    };

    console.log("=> Criando nova conexão com o banco de dados");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then(mongoose => {
      console.log("=> Conexão com MongoDB estabelecida com sucesso!");
      return mongoose;
    });
  }
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Reseta a promessa em caso de erro
    console.error("Erro ao conectar ao MongoDB:", e);
    throw new Error("Não foi possível conectar ao banco de dados.");
  }
  return cached.conn;
}

export default dbConnect;

declare global {
  var mongoose: any;
}
