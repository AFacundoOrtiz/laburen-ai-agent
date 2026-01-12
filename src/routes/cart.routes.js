import { Router } from "express";
import {
  getCart,
  createCart,
  updateCart,
  updateCartStatus,
} from "../controllers/cart.controller.js";

const router = Router();

router.post("/", createCart);
router.patch("/:id", updateCart);
router.get("/:waId", getCart);
router.put("/:waId/status", updateCartStatus);

export default router;
