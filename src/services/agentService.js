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

  let toolExecutions = [];

  while (functionCalls && functionCalls.length > 0 && loops < MAX_TOOL_LOOPS) {
    loops++;
    const call = functionCalls[0];
    const { name, args } = call;
    console.log(`🤖 IA Acción ${loops}: ${name}`, args);

    let actionResponse;
    try {
      if (!functionsMap[name])
        throw new Error(`Herramienta desconocida: ${name}`);

      actionResponse = await functionsMap[name](args, waId);

      toolExecutions.push({
        role: "function",
        name: name,
        response: actionResponse,
      });
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
    functionCalls = response.functionCalls();
  }

  return {
    text: response.text(),
    toolExecutions,
  };
};

export const processUserMessage = async (waId, message, chatHistory = []) => {
  try {
    const mockRes = await handleMockMode(waId, message);
    if (mockRes) return { text: mockRes, toolExecutions: [] };

    const formattedHistory = chatHistory
      .map((msg) => {
        if (msg.role === "user") {
          return {
            role: "user",
            parts: [{ text: msg.content }],
          };
        }

        if (msg.role === "assistant") {
          return {
            role: "model",
            parts: [{ text: msg.content }],
          };
        }

        if (msg.role === "function" && msg.metadata) {
          return {
            role: "function",
            parts: [
              {
                functionResponse: {
                  name: msg.metadata.name,
                  response: { result: msg.metadata.response },
                },
              },
            ],
          };
        }

        return null;
      })
      .filter(Boolean);

    console.log(
      `\n--- MEMORIA ENVIADA A GEMINI (${formattedHistory.length} msgs) ---`
    );
    console.dir(formattedHistory, { depth: null, colors: true });
    console.log(
      "-----------------------------------------------------------\n"
    );

    const model = getGeminiModel(GEN_AI_MODEL_NAME, toolsDefinition);

    const chat = model.startChat({
      generationConfig: { temperature: 0.5, maxOutputTokens: 1000 },
      history: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
        ...formattedHistory,
      ],
    });

    const result = await sendMessageWithRetry(chat, message);

    const { text, toolExecutions } = await executeToolLoop(
      chat,
      result.response,
      waId
    );

    return {
      text: text || "Procesado, pero sin respuesta de texto.",
      toolExecutions,
    };
  } catch (error) {
    console.error("Error en AgentService:", error);
    return {
      text: "Tuve un error técnico. Por favor intenta de nuevo.",
      toolExecutions: [],
    };
  }
};
