import { API_URL } from "../config/api.js";

export const addItemToCart = async (waId, productId, quantity) => {
  try {
    let currentCartId = null;

    try {
      const checkResponse = await fetch(`${API_URL}/cart/${waId}`);
      if (checkResponse.ok) {
        const cart = await checkResponse.json();
        currentCartId = cart.id;
      }
    } catch (e) {
      console.warn("No se pudo verificar carrito, intentando crear uno nuevo.");
    }

    const method = currentCartId ? "PATCH" : "POST";
    const endpoint = currentCartId
      ? `${API_URL}/cart/${currentCartId}`
      : `${API_URL}/cart`;

    console.log(`🛒 Ejecutando ${method} en ${endpoint}`);

    let payload;
    if (method === "POST") {
      payload = { waId, items: [{ product_id: productId, qty: quantity }] };
    } else {
      payload = { items: [{ product_id: productId, qty: quantity }] };
    }

    const response = await fetch(endpoint, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Error API: ${errorData.error || response.statusText}`);
    }

    const cartData = await response.json();

    return {
      success: true,
      cartId: cartData.id,
      message: currentCartId
        ? "Carrito actualizado"
        : "Carrito creado exitosamente",
    };
  } catch (error) {
    console.error("Error en addItemToCart:", error);
    return { success: false, error: "No pude agregar el producto." };
  }
};

export const updateCartItem = async (waId, productId, quantity) => {
  return await addItemToCart(waId, productId, quantity);
};

export const confirmOrder = async (waId) => {
  return await changeCartStatus(waId, "COMPLETED");
};

export const clearCart = async (waId) => {
  return await changeCartStatus(waId, "CANCELED");
};

const changeCartStatus = async (waId, status) => {
  try {
    console.log(`Cambiando estado de carrito ${waId} a ${status}`);

    const response = await fetch(`${API_URL}/cart/${waId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      if (response.status === 404)
        return { success: false, error: "No tienes un carrito activo." };
      throw new Error("Error cambiando estado");
    }

    const data_ = await response.json();
    return {
      success: true,
      message:
        status === "COMPLETED" ? "¡Compra confirmada!" : "Carrito cancelado.",
    };
  } catch (error) {
    console.error("Error changing status:", error);
    return { success: false, error: "Error procesando la solicitud." };
  }
};
