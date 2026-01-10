import { Router } from "express";
import productRoutes from "./product.routes.js";
import cartRoutes from "./cart.routes.js";
import agentRoutes from "./agent.routes.js";
import whatsappRoutes from "./whatsapp.routes.js";

const router = Router();

router.use("/products", productRoutes);
router.use("/cart", cartRoutes);
router.use("/agent", agentRoutes);
router.use("/whatsapp", whatsappRoutes);

export default router;
