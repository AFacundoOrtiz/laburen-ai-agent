import { processUserMessage } from "../services/agentService.js";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const receiveMessage = async (req, res) => {
  try {
    const incomingMsg = req.body.Body;
    const from = req.body.From;

    const aiResponse = await processUserMessage(from, incomingMsg);

    await client.messages.create({
      body: aiResponse,
      from: "whatsapp:+14155238886",
      to: from,
    });

    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
  } catch (error) {
    console.error("Error en webhook de WhatsApp:", error);
    res.status(500).send("Error interno");
  }
};
