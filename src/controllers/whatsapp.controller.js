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

    console.log(`Mensaje recibido de ${from}: ${incomingMsg}`);

    let aiResponse = await processUserMessage(from, incomingMsg);

    if (
      !aiResponse ||
      typeof aiResponse !== "string" ||
      aiResponse.trim() === ""
    ) {
      console.error("ALERTA: La IA devolvió una respuesta vacía o inválida.");
      aiResponse =
        "Lo siento, tuve un pequeño problema técnico pensando mi respuesta. ¿Podrías preguntarme de nuevo?";
    }

    await client.messages.create({
      body: aiResponse,
      from: "whatsapp:+14155238886",
      to: from,
    });

    res.set("Content-Type", "text/xml");
    res.send("<Response></Response>");
  } catch (error) {
    console.error("Error CRÍTICO en webhook de WhatsApp:", error);
    res.status(200).send("Error procesado");
  }
};
