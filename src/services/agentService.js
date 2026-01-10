import { GoogleGenerativeAI } from "@google/generative-ai";
import { toolsDefinition } from "../config/tools.js";
import { searchProducts } from "./productService.js";
import {
  addItemToCart,
  getOrCreateCart,
  updateCartItem,
  clearCart,
} from "./cartService.js";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const functionsMap = {
  search_products: async ({ query }) => {
    return await searchProducts(query);
  },
  add_to_cart: async ({ productId, quantity }, waId) => {
    return await addItemToCart(waId, productId, quantity);
  },
  get_cart_info: async ({}, waId) => {
    return await getOrCreateCart(waId);
  },
  update_cart_item: async ({ productId, quantity }, waId) => {
    return await updateCartItem(waId, productId, quantity);
  },
  clear_cart: async ({}, waId) => {
    return await clearCart(waId);
  },
};

export const processUserMessage = async (waId, userMessage) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      tools: toolsDefinition,
    });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `
            Actúa como un vendedor amable y profesional de la tienda de ropa "Laburen".
            Tu objetivo es ayudar al usuario a encontrar productos y cerrar ventas.

            REGLAS ESTRICTAS DE RESPUESTA (Síguelas siempre):
            1. ⛔ NO muestres IDs: Nunca muestres los UUIDs (ej: 9f6307...) al usuario. Úsalos internamente para las funciones, pero ocúltalos en el texto.
            2. 💲 Formato de Precio: Muestra los precios limpios, ej: "$15.50". NO uses barras invertidas (\) antes del signo $.
            3. ✨ Estilo WhatsApp: Usa negritas (*) para resaltar el **nombre del producto** y el **precio**.
            4. 🛒 Venta: Si el usuario muestra interés claro, ofrécele agregarlo al carrito.
            `,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "¡Entendido! Soy el vendedor de Laburen. No mostraré IDs técnicos y cuidaré el formato de los precios para que se vean bien en WhatsApp. ¿Qué estás buscando hoy?",
            },
          ],
        },
      ],
    });

    console.log(`Usuario (${waId}): ${userMessage}`);

    let result = await chat.sendMessage(userMessage);
    let response = result.response;
    let call = response.functionCalls();

    let loops = 0;
    while (call && call.length > 0 && loops < 5) {
      loops++;
      const firstCall = call[0];
      const functionName = firstCall.name;
      const args = firstCall.args;

      console.log(`Agente ejecuta (${loops}): ${functionName}`, args);

      const actionFunction = functionsMap[functionName];
      if (!actionFunction) {
        throw new Error(`Función no encontrada: ${functionName}`);
      }

      const apiResponse = await actionFunction(args, waId);

      const resultPart = [
        {
          functionResponse: {
            name: functionName,
            response: { result: apiResponse },
          },
        },
      ];

      result = await chat.sendMessage(resultPart);
      response = result.response;
      call = response.functionCalls();
    }

    return response.text();
  } catch (error) {
    console.error("Error en agentService:", error);
    return "Lo siento, tuve un error procesando tu solicitud.";
  }
};
