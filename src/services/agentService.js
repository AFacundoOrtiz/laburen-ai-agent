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
  let functionCalls = response.functionCalls();
  let loops = 0;

  while (functionCalls && functionCalls.length > 0 && loops < MAX_TOOL_LOOPS) {
    loops++;

    const functionResponses = await Promise.all(
      functionCalls.map(async (call) => {
        const { name, args } = call;
        console.log(`> Ejecutando: ${name}`, args);

        let result;
        try {
          if (!functionsMap[name]) {
            throw new Error(`Herramienta no implementada: ${name}`);
          }
          result = await functionsMap[name](args, waId);
        } catch (err) {
          console.error(`Error en ${name}:`, err);
          result = { error: "Error técnico al procesar esta acción." };
        }

        return {
          functionResponse: {
            name: name,
            response: { result: result },
          },
        };
      })
    );

    const result = await sendMessageWithRetry(chat, functionResponses);

    response = result.response;
    functionCalls = response.functionCalls();
  }

  return response.text();
};

export const processUserMessage = async (waId, message, chatHistory = []) => {
  try {
    const mockRes = await handleMockMode(waId, message);
    if (mockRes) return mockRes;

    const recentHistory = chatHistory.slice(-40).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const model = getGeminiModel(
      GEN_AI_MODEL_NAME,
      toolsDefinition,
      SYSTEM_PROMPT
    );

    const chat = model.startChat({
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      history: recentHistory,
    });

    const result = await sendMessageWithRetry(chat, message);

    const finalText = await executeToolLoop(chat, result.response, waId);

    return finalText || "Procesado, pero sin respuesta de texto.";
  } catch (error) {
    console.error("Error en AgentService:", error);
    return "Tuve un error técnico. Por favor intenta de nuevo.";
  }
};
