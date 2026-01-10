import prisma from "../config/prisma.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

export const searchProducts = async (userQuery) => {
  try {
    const result = await model.embedContent(userQuery);
    const queryVector = result.embedding.values;

    const vectorString = `[${queryVector.join(",")}]`;

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

    const formattedProducts = products.map((p) => ({
      ...p,
      price: parseFloat(p.price),
      similarity: parseFloat(p.similarity).toFixed(4),
    }));

    return formattedProducts;
  } catch (error) {
    console.error("Error en búsqueda:", error);
    return [];
  }
};
