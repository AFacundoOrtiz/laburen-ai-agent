import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/prisma.js";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function generateEmbeddings() {
  try {
    const products = await prisma.$queryRaw`
      SELECT id, name, description, category 
      FROM products 
      WHERE embedding IS NULL
    `;

    if (products.length === 0) {
      return;
    }

    let updatedCount = 0;

    for (const product of products) {
      const textToEmbed = `Producto: ${product.name}. Categoría: ${
        product.category || "General"
      }. Descripción: ${product.description || ""}`;

      try {
        const result = await model.embedContent(textToEmbed);
        const vector = result.embedding.values;
        const vectorString = `[${vector.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `UPDATE products SET embedding = $1::vector WHERE id = $2::uuid`,
          vectorString,
          product.id
        );

        updatedCount++;
        process.stdout.write(".");
      } catch (innerError) {
        console.error(`Error en producto ${product.name}:`, innerError.message);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generateEmbeddings();
