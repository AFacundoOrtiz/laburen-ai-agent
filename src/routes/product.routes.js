import { Router } from "express";
import {
  search,
  getProducts,
  getProductById,
} from "../controllers/product.controller.js";

const router = Router();

router.get("/search", search);
router.get("/all", getProducts);
router.get("/:id", getProductById);

export default router;
