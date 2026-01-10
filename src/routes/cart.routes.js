import { Router } from "express";
import {
  getCart,
  createCart,
  updateCart,
} from "../controllers/cart.controller.js";

const router = Router();

router.post("/", createCart);
router.patch("/:id", updateCart);
router.get("/:waId", getCart);

export default router;
