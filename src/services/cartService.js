import prisma from "../config/prisma.js";

export const getOrCreateCart = async (waId) => {
  let cart = await prisma.cart.findUnique({
    where: { waId },
    include: {
      items: {
        include: { product: true },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { waId },
      include: { items: true },
    });
  }

  return cart;
};

export const addItemToCart = async (waId, productId, quantity = 1) => {
  const cart = await getOrCreateCart(waId);

  const item = await prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: productId,
      },
    },
    update: {
      qty: { increment: quantity },
    },
    create: {
      cartId: cart.id,
      productId: productId,
      qty: quantity,
    },
  });

  return item;
};

export const clearCart = async (waId) => {
  const cart = await getOrCreateCart(waId);

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return { success: true };
};

export const updateCartItem = async (waId, productId, quantity) => {
  const cart = await getOrCreateCart(waId);

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId: productId,
      },
    });
    return { status: "deleted", message: "Producto eliminado del carrito" };
  }

  const item = await prisma.cartItem.update({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: productId,
      },
    },
    data: {
      qty: quantity,
    },
  });

  return { status: "updated", item };
};
