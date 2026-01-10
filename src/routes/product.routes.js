import { Router } from "express";
import {
  getProducts,
  getProductById,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/all", getProducts);
router.get("/:id", getProductById);

export default router;
