import { Router } from "express";
import { getCart, addItem } from "../controllers/cart.controller.js";

const router = Router();

router.get("/:waId", getCart);

router.post("/add", addItem);

export default router;
