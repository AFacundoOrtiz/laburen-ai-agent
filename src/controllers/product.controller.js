import prisma from "../config/prisma.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

// GET /products
export const getProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      const products = await prisma.product.findMany({
        take: 20,
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          description: true,
        },
      });
      return res.json(products);
    }

    const result = await embeddingModel.embedContent(q);
    const vector = result.embedding.values;

    const vectorString = `[${vector.join(",")}]`;

    const products = await prisma.$queryRaw`
      SELECT 
        id, 
        name, 
        description, 
        price, 
        stock
      FROM products
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT 10;
    `;

    const formattedProducts = products.map((p) => ({
      ...p,
      price: Number(p.price),
    }));

    res.json(formattedProducts);
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
