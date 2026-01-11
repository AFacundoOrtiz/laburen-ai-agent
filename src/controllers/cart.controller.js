import prisma from "../config/prisma.js";

// POST /api/cart
export const createCart = async (req, res) => {
  try {
    const { items = [], waId } = req.body;
    if (!waId) {
      return res
        .status(400)
        .json({ error: "Falta el waId para crear el carrito" });
    }
    const cart = await prisma.cart.create({
      data: {
        waId: waId,
        items: {
          create: items.map((item) => ({
            productId: item.product_id,
            qty: item.qty,
          })),
        },
      },
      include: { items: true },
    });

    res.status(201).json(cart);
  } catch (error) {
    console.error("Error Prisma:", error);
    if (error.code === "P2002") {
      return res
        .status(409)
        .json({ error: "Ya existe un carrito para este usuario" });
    }
    res.status(500).json({ error: "Error al crear el carrito" });
  }
};

// GET /api/cart/:waId
export const getCart = async (req, res) => {
  try {
    const { waId } = req.params;

    if (!waId)
      return res
        .status(400)
        .json({ error: "Falta el ID del carrito o usuario" });

    const cart = await prisma.cart.findFirst({
      where: {
        OR: [{ id: waId }, { waId: waId }],
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      return res.status(404).json({ error: "Carrito no encontrado" });
    }

    const total = cart.items.reduce((acc, item) => {
      return acc + Number(item.product.price) * item.qty;
    }, 0);

    res.json({ ...cart, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el carrito" });
  }
};

// PATCH /api/cart/:id
export const updateCart = async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body;

    const cartExists = await prisma.cart.findUnique({ where: { id } });
    if (!cartExists)
      return res.status(404).json({ error: "Carrito no encontrado" });

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Formato de items inválido" });
    }

    for (const item of items) {
      if (item.qty <= 0) {
        await prisma.cartItem.deleteMany({
          where: {
            cartId: id,
            productId: item.product_id,
          },
        });
      } else {
        await prisma.cartItem.upsert({
          where: {
            cartId_productId: {
              cartId: id,
              productId: item.product_id,
            },
          },
          update: { qty: item.qty },
          create: {
            cartId: id,
            productId: item.product_id,
            qty: item.qty,
          },
        });
      }
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { id },
      include: { items: true },
    });

    res.json(updatedCart);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el carrito" });
  }
};
