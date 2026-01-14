import { processUserMessage } from "../services/agentService.js";
import { smartSplit } from "../utils/textUtils.js";
import client from "../config/twilio.js";
import dotenv from "dotenv";
import prisma from "../config/prisma.js";

dotenv.config();

export const verifyWebhook = (req, res) => {
  try {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode && token) {
      if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    } else {
      res.sendStatus(400);
    }
  } catch (error) {
    console.error("Error en verifyWebhook:", error);
    res.sendStatus(500);
  }
};

export const receiveMessage = async (req, res) => {
  try {
    const incomingMessage = req.body.Body;
    const waId = req.body.From;

    if (!incomingMessage) {
      return res.status(200).send("OK");
    }

    const savedUserMsg = await prisma.message.create({
      data: {
        waId: waId,
        content: incomingMessage,
        role: "user",
      },
    });

    const history = await prisma.message.findMany({
      where: {
        waId: waId,
        id: { not: savedUserMsg.id },
      },
      orderBy: { createdAt: "asc" },
      take: 30,
    });

    const { text: responseText, toolExecutions } = await processUserMessage(
      waId,
      incomingMessage,
      history
    );

    if (toolExecutions && toolExecutions.length > 0) {
      for (const toolExec of toolExecutions) {
        await prisma.message.create({
          data: {
            waId: waId,
            role: "function",
            content: `Resultado de ${toolExec.name}`,
            metadata: {
              name: toolExec.name,
              response: toolExec.response,
            },
          },
        });
      }
    }

    await prisma.message.create({
      data: {
        waId: waId,
        content: responseText,
        role: "assistant",
      },
    });

    const messagesToSend = smartSplit(responseText, 1500);

    for (const chunk of messagesToSend) {
      if (chunk && chunk.trim().length > 0) {
        try {
          await client.messages.create({
            body: chunk,
            from: process.env.TWILIO_WHATSAPP_NUMBER,
            to: waId,
          });
        } catch (twilioError) {
          console.log("Fallo envío Twilio:", chunk);
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error en webhook de WhatsApp:", error);

    const waId = req.body?.From;
    if (waId) {
      try {
        await client.messages.create({
          body: "Lo siento, tuve un error interno momentáneo. Por favor intenta de nuevo en unos segundos. 🤖🔧",
          from: process.env.TWILIO_WHATSAPP_NUMBER,
          to: waId,
        });
      } catch (fallbackError) {
        console.error("Error enviando mensaje de fallback:", fallbackError);
      }
    }

    res.status(200).send("Error procesado");
  }
};
