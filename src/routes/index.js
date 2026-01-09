import { Router } from "express";
import productRoutes from "./product.routes.js";

const router = Router();

router.use("/products", productRoutes);

// Futuro:
// import cartRoutes from "./cart.routes.js";
// router.use("/carts", cartRoutes);

export default router;
