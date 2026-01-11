import { API_URL } from "../config/api.js";

const activeCarts = new Map();

export const addItemToCart = async (waId, productId, quantity) => {
  try {
    const currentCartId = activeCarts.get(waId);

    const method = currentCartId ? "PATCH" : "POST";

    const endpoint = currentCartId
      ? `${API_URL}/cart/${currentCartId}`
      : `${API_URL}/cart`;

    console.log(`Ejecutando ${method} en ${endpoint}`);

    const payload = {
      waId: waId,
      items: [{ product_id: productId, qty: quantity }],
    };

    const response = await fetch(endpoint, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Error API ${method}: ${errorData.error || response.statusText}`
      );
    }

    const cartData = await response.json();

    activeCarts.set(waId, cartData.id);

    return {
      success: true,
      cartId: cartData.id,
      message: currentCartId
        ? "Carrito actualizado"
        : "Carrito creado exitosamente",
    };
  } catch (error) {
    console.error("Error en addItemToCart (API):", error);
    return { success: false, error: "No pude agregar el producto." };
  }
};

export const updateCartItem = async (waId, productId, quantity) => {
  try {
    const currentCartId = activeCarts.get(waId);

    if (!currentCartId) {
      return {
        success: false,
        error: "No tienes un carrito activo para editar.",
      };
    }

    const endpoint = `${API_URL}/cart/${currentCartId}`;
    console.log(`Ejecutando PATCH en ${endpoint}`);

    const payload = {
      items: [{ product_id: productId, qty: quantity }],
    };

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Error API PATCH: ${errorData.error || response.statusText}`
      );
    }

    return { success: true, message: "Cantidad actualizada." };
  } catch (error) {
    console.error("Error en updateCartItem (API):", error);
    return { success: false, error: "Error al actualizar el carrito." };
  }
};

export const getCartInfo = async (waId) => {
  const currentCartId = activeCarts.get(waId);
  if (!currentCartId) return "El carrito está vacío.";
  return `Carrito activo ID: ${currentCartId}`;
};

export const clearCart = async (waId) => {
  activeCarts.delete(waId);
  return { success: true, message: "Carrito cerrado." };
};
