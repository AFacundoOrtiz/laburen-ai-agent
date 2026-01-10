import { Router } from "express";
import { receiveMessage } from "../controllers/whatsapp.controller.js";

const router = Router();

router.post("/webhook", receiveMessage);

export default router;
