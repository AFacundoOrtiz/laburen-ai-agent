import * as productService from "../services/productService.js";
import * as cartService from "../services/cartService.js";

export const functionsMap = {
  search_products: async ({ query, page = 1 }) => {
    const products = await productService.searchProducts(query, page);
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
    }));
  },
  add_to_cart: async ({ product_id, quantity }, waId) => {
    const result = await cartService.addItemToCart(waId, product_id, quantity);
    return {
      success: result.success,
      message: result.message,
      total_items: result.cartId ? "Items actualizados" : "0",
    };
  },
  update_cart_item: async ({ product_id, quantity }, waId) => {
    return await cartService.updateCartItem(waId, product_id, quantity);
  },
  confirm_order: async ({}, waId) => {
    return await cartService.confirmOrder(waId);
  },
  cancel_order: async ({}, waId) => {
    return await cartService.clearCart(waId);
  },
};
