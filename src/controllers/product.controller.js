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
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          description: true,
        },
      });

      const formattedProducts = products.map((p) => ({
        ...p,
        price: Number(p.price),
      }));

      return res.json(formattedProducts);
    }

    if (q) {
      const result = await embeddingModel.embedContent(q);
      const vector = result.embedding.values;
      const vectorString = `[${vector.join(",")}]`;

      const products = await prisma.$queryRaw`
        SELECT 
          id, 
          name,
          price, 
          stock,
          description
        FROM products
        ORDER BY embedding <=> ${vectorString}::vector
        LIMIT ${limit} 
        OFFSET ${offset};
      `;

      const formattedProducts = products.map((p) => ({
        ...p,
        price: Number(p.price),
      }));

      return res.json(formattedProducts);
    }

    const products = await prisma.product.findMany({
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        description: true,
      },
    });

    const formattedSimple = products.map((p) => ({
      ...p,
      price: Number(p.price),
    }));

    return res.json(formattedSimple);
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
