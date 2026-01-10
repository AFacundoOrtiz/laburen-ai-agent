import {
  getOrCreateCart,
  addItemToCart,
  clearCart,
} from "../services/cartService.js";

export const getCart = async (req, res) => {
  try {
    const { waId } = req.params;
    if (!waId) return res.status(400).json({ error: "Falta waId" });

    const cart = await getOrCreateCart(waId);

    const total = cart.items.reduce((acc, item) => {
      return acc + Number(item.product.price) * item.qty;
    }, 0);

    res.json({ ...cart, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addItem = async (req, res) => {
  try {
    const { waId } = req.body;
    const { productId, quantity } = req.body;

    if (!waId || !productId)
      return res.status(400).json({ error: "Datos incompletos" });

    const result = await addItemToCart(waId, productId, Number(quantity) || 1);
    res.json({ success: true, item: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
