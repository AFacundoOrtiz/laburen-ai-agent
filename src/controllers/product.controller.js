import prisma from "../config/prisma.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

// GET /products
export const getProducts = async (req, res) => {
  try {
    const { q, page = 1, sort = "relevance" } = req.query;
    const limit = 5;
    const offset = (page - 1) * limit;

    if (sort === "price_asc") {
      const whereClause = {};
      if (q && q.trim() !== "") {
        whereClause.OR = [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ];
      }
      const products = await prisma.product.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { price: "asc" },
      });
      return res.json(products.map((p) => ({ ...p, price: Number(p.price) })));
    }

    if (q) {
      console.log(`🔎 Buscando híbrido: "${q}"`);

      const textProducts = await prisma.product.findMany({
        where: {
          OR: [{ name: { contains: q, mode: "insensitive" } }],
        },
        take: limit,
        skip: offset,
      });

      if (textProducts.length > 0) {
        console.log("Match exacto encontrado. Omitiendo vectores.");
        return res.json(
          textProducts.map((p) => ({ ...p, price: Number(p.price) }))
        );
      }

      console.log("Sin match exacto. Usando Búsqueda Vectorial...");

      const result = await embeddingModel.embedContent(q);
      const vector = result.embedding.values;
      const vectorString = `[${vector.join(",")}]`;

      const vectorProducts = await prisma.$queryRaw`
        SELECT id, name, price, stock, description
        FROM products
        ORDER BY embedding <=> ${vectorString}::vector
        LIMIT ${limit} 
        OFFSET ${offset};
      `;

      return res.json(
        vectorProducts.map((p) => ({ ...p, price: Number(p.price) }))
      );
    }

    const products = await prisma.product.findMany({
      take: limit,
      skip: offset,
    });

    return res.json(products.map((p) => ({ ...p, price: Number(p.price) })));
  } catch (error) {
    console.error("Error en getProducts:", error);
    res.status(500).json({ error: "Error al buscar productos" });
  }
};

// GET /products/:id
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener el producto" });
  }
};
