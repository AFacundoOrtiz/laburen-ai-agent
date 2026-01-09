import { searchProducts } from "../services/productService.js";

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
