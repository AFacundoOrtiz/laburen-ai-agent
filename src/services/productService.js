import { API_URL } from "../config/api.js";

export const searchProducts = async (query, page = 1, sort = "relevance") => {
  try {
    const params = new URLSearchParams();

    if (query) params.append("q", query);
    params.append("page", page.toString());
    params.append("sort", sort);

    const response = await fetch(`${API_URL}/products?${params.toString()}`);

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

export const getProductById = async (id) => {
  try {
    const response = await fetch(`${API_URL}/products/${id}`);

    if (!response.ok) {
      console.warn(`API: Error ${response.status} al buscar producto ${id}`);
      return null;
    }

    const product = await response.json();
    return product;
  } catch (error) {
    console.error("Error de conexión con la API de productos:", error);
    return null;
  }
};
