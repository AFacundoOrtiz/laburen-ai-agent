import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/prisma.js";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function getEmbeddingWithRetry(text, retries = 5, delay = 5000) {
  try {
    return await model.embedContent(text);
  } catch (error) {
    if (
      retries > 0 &&
      (error.message.includes("429") || error.message.includes("503"))
    ) {
      console.warn(
        `Cuota excedida. Esperando ${delay / 1000}s para reintentar...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return getEmbeddingWithRetry(text, retries - 1, delay * 2);
    }
    throw error;
  }
}

async function generateEmbeddings() {
  try {
    console.log("Iniciando generación de embeddings (Modo Seguro)...");

    const products = await prisma.$queryRaw`
      SELECT id, name, description, category 
      FROM products 
      WHERE embedding IS NULL
    `;

    if (products.length === 0) {
      console.log("Todos los productos ya tienen embeddings.");
      return;
    }

    console.log(`Procesando ${products.length} productos pendientes...`);
    console.log(
      "Velocidad limitada a ~12 productos por minuto para evitar bloqueos."
    );

    let updatedCount = 0;

    for (const [index, product] of products.entries()) {
      const textToEmbed = `Producto: ${product.name}. Categoría: ${
        product.category || "General"
      }. Descripción: ${product.description || ""}`;

      try {
        process.stdout.write(
          `[${index + 1}/${products.length}] ${product.name.substring(
            0,
            20
          )}... `
        );

        const result = await getEmbeddingWithRetry(textToEmbed);

        const vector = result.embedding.values;
        const vectorString = `[${vector.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `UPDATE products SET embedding = $1::vector WHERE id = $2::uuid`,
          vectorString,
          product.id
        );

        console.log("Completado");
        updatedCount++;
      } catch (innerError) {
        console.log("Error");
        console.error(
          `Error final en producto ${product.name}:`,
          innerError.message
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 4500));
    }

    console.log(`Proceso finalizado. ${updatedCount} embeddings generados.`);
  } catch (error) {
    console.error("Error fatal en el script:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generateEmbeddings();
