import { processUserMessage } from "../services/agentService.js";

export const chat = async (req, res) => {
  try {
    const { message, waId } = req.body;

    if (!message || !waId) {
      return res.status(400).json({ error: "Faltan datos (message, waId)" });
    }

    const response = await processUserMessage(waId, message);

    res.json({
      user: message,
      agent: response,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
