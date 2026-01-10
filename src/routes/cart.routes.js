import { Router } from "express";
import {
  getCart,
  addItem,
  createCart,
  updateCart,
} from "../controllers/cart.controller.js";

const router = Router();

router.post("/create", createCart);
router.patch("/:id", updateCart);
router.get("/:waId", getCart);
router.post("/add", addItem);

export default router;
