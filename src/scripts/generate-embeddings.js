import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../config/prisma.js";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function generateEmbeddings() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
      },
    });

    console.log(`Procesando ${products.length} productos...`);
    let updatedCount = 0;

    for (const product of products) {
      // Creamos el texto que representa al producto semánticamente
      const textToEmbed = `Producto: ${product.name}. Categoría: ${
        product.category || "General"
      }. Descripción: ${product.description || ""}`;

      try {
        // Generar vector con Gemini
        const result = await model.embedContent(textToEmbed);
        const vector = result.embedding.values;

        // Convertir vector a string formato array para SQL
        const vectorString = `[${vector.join(",")}]`;

        // Actualizar en DB usando SQL directo (necesario para castear ::vector)
        await prisma.$executeRawUnsafe(
          `UPDATE products SET embedding = $1::vector WHERE id = $2::uuid`,
          vectorString,
          product.id
        );

        updatedCount++;
        process.stdout.write("."); // Feedback visual de progreso
      } catch (innerError) {
        console.error(`Error en producto ${product.name}:`, innerError.message);
      }

      // Pequeña pausa para evitar rate-limits de Google
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`${updatedCount} productos actualizados con vectores.`);
  } catch (error) {
    console.error("Error general:", error);
  } finally {
    await prisma.$disconnect();
  }
}

generateEmbeddings();
