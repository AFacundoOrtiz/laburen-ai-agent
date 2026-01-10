import { API_URL } from "../config/api.js";

export const searchProducts = async (userQuery) => {
  try {
    const response = await fetch(
      `${API_URL}/products?q=${encodeURIComponent(userQuery)}`
    );

    if (!response.ok) {
      throw new Error(
        `Error en la API: ${response.status} ${response.statusText}`
      );
    }

    const products = await response.json();

    const formattedProducts = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price),
      stock: p.stock,
      description: p.description,
    }));

    return formattedProducts;
  } catch (error) {
    console.error("Error conectando con la API de productos:", error.message);
    return [];
  }
};
