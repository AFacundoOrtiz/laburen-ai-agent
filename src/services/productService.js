import prisma from "../config/prisma.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

export const searchProducts = async (userQuery) => {
  try {
    console.log(`🔍 Buscando concepto: "${userQuery}"`);

    // 1. Convertir la pregunta del usuario en vector (Embedding)
    const result = await model.embedContent(userQuery);
    const queryVector = result.embedding.values;

    // Convertir a string con formato de array para SQL
    const vectorString = `[${queryVector.join(",")}]`;

    // 2. Consulta Semántica a PostgreSQL
    // - Calcula la "Distancia Coseno" (<=>) entre el vector del usuario y los productos.
    // - Ordena de menor distancia (más parecido) a mayor.
    // - Filtra los que sean demasiado diferentes (> 0.5 de similitud).

    const products = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        price, 
        stock, 
        description,
        1 - (embedding <=> ${vectorString}::vector) as similarity
      FROM products
      WHERE 1 - (embedding <=> ${vectorString}::vector) > 0.4
      ORDER BY similarity DESC
      LIMIT 5;
    `;

    // Convertir BigInts o Decimales a tipos JS nativos si es necesario
    const formattedProducts = products.map((p) => ({
      ...p,
      price: parseFloat(p.price), // Postgres devuelve Decimal como string a veces
      similarity: parseFloat(p.similarity).toFixed(4), // Para ver qué tan seguro está
    }));

    return formattedProducts;
  } catch (error) {
    console.error("❌ Error en búsqueda semántica:", error);
    return [];
  }
};
