import { getGeminiModel } from "../config/gemini.js";
import { SYSTEM_PROMPT } from "../ai/prompts.js";
import { toolsDefinition } from "../ai/tools.js";
import { functionsMap } from "../ai/functions.js";
import { handleMockMode } from "../utils/mockHandler.js";

const GEN_AI_MODEL_NAME = "gemini-2.5-flash";
const MAX_TOOL_LOOPS = 5;

const sendMessageWithRetry = async (
  chat,
  payload,
  retries = 3,
  delay = 1000
) => {
  try {
    return await chat.sendMessage(payload);
  } catch (error) {
    const errorMsg = error.message || "";
    const isQuotaError = errorMsg.includes("429") || errorMsg.includes("503");

    if (isQuotaError && retries > 0) {
      console.warn(
        `Gemini sobrecargado (429/503). Reintentando en ${delay}ms... (Intentos restantes: ${retries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendMessageWithRetry(chat, payload, retries - 1, delay * 2);
    }

    throw error;
  }
};

const executeToolLoop = async (chat, initialResponse, waId) => {
  let response = initialResponse;
  let functionCall = response.functionCalls()
    ? response.functionCalls()[0]
    : null;
  let loops = 0;

  while (functionCall && loops < MAX_TOOL_LOOPS) {
    const { name, args } = functionCall;
    loops++;
    console.log(`IA Acción ${loops}: ${name}`, args);

    let actionResponse;
    try {
      if (!functionsMap[name])
        throw new Error(`Herramienta desconocida: ${name}`);
      actionResponse = await functionsMap[name](args, waId);
    } catch (err) {
      console.error(`Error en tool ${name}:`, err);
      actionResponse = { error: "Fallo técnico en herramienta." };
    }

    const result = await sendMessageWithRetry(chat, [
      {
        functionResponse: { name, response: { result: actionResponse } },
      },
    ]);

    response = result.response;
    functionCall = response.functionCalls()
      ? response.functionCalls()[0]
      : null;
  }
  return response.text();
};

export const processUserMessage = async (waId, message) => {
  try {
    const mockRes = await handleMockMode(waId, message);
    if (mockRes) return mockRes;

    const model = getGeminiModel(GEN_AI_MODEL_NAME, toolsDefinition);
    const chat = model.startChat({
      generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
      history: [{ role: "user", parts: [{ text: SYSTEM_PROMPT }] }],
    });

    const result = await sendMessageWithRetry(chat, message);
    const finalText = await executeToolLoop(chat, result.response, waId);

    return finalText || "Procesado, pero sin respuesta de texto.";
  } catch (error) {
    console.error("Error en AgentService:", error);
    return "Tuve un error técnico. Por favor intenta de nuevo.";
  }
};
