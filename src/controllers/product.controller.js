import { searchProducts } from "../services/productService.js";
import prisma from "../config/prisma.js";

export const search = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Falta el parámetro '?query='",
      });
    }

    const results = await searchProducts(query);

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error en el controlador de búsqueda:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
};

// GET /products
export const getProducts = async (req, res) => {
  try {
    const { q } = req.query;

    let whereClause = {};
    if (q) {
      whereClause = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        description: true,
      },
    });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener productos" });
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
