import { GoogleGenerativeAI } from "@google/generative-ai";
import * as productService from "./productService.js";
import * as cartService from "./cartService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const tools = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description: "Busca productos en el catálogo por nombre o descripción.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description:
                "Término de búsqueda (ej: 'pantalón rojo', 'verano')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "add_to_cart",
        description:
          "Agrega un producto al carrito de compras. Si el carrito no existe, lo crea.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description: "ID del producto a agregar",
            },
            quantity: { type: "INTEGER", description: "Cantidad a agregar" },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "update_cart_item",
        description:
          "Actualiza la cantidad de un producto que YA está en el carrito.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description: "ID del producto a modificar",
            },
            quantity: {
              type: "INTEGER",
              description: "Nueva cantidad total (ej: 0 para borrar)",
            },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "clear_cart",
        description: "Vacía el carrito o cierra la sesión de compra actual.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
];

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  tools: tools,
});

const functions = {
  search_products: async ({ query }) => {
    return await productService.searchProducts(query);
  },
  add_to_cart: async ({ product_id, quantity }, waId) => {
    return await cartService.addItemToCart(waId, product_id, quantity);
  },
  update_cart_item: async ({ product_id, quantity }, waId) => {
    return await cartService.updateCartItem(waId, product_id, quantity);
  },
  clear_cart: async ({}, waId) => {
    return await cartService.clearCart(waId);
  },
};

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

export const processUserMessage = async (waId, message) => {
  try {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `
            Eres el vendedor virtual de "Laburen". Tu trabajo es ayudar a los clientes a comprar ropa.
            
            REGLAS:
            1. Usa search_products para buscar lo que pide el usuario.
            2. Muestra los productos con precio (formato $10.00) y sin mostrar IDs técnicos.
            3. Si el usuario quiere comprar, usa add_to_cart.
            4. Si quiere cambiar cantidad, usa update_cart_item.
            5. Si dice "gracias" o "comprar", despídete amablemente.
            `,
            },
          ],
        },
        {
          role: "model",
          parts: [
            {
              text: "Entendido. Soy el vendedor de Laburen. ¿En qué puedo ayudarte?",
            },
          ],
        },
      ],
    });

    const result = await sendMessageWithRetry(chat, message);
    const response = result.response;

    const call = response.functionCalls() ? response.functionCalls()[0] : null;

    if (call) {
      const functionName = call.name;
      const args = call.args;

      console.log(`🤖 IA intenta ejecutar: ${functionName}`, args);

      const actionResponse = await functions[functionName](args, waId);

      const result2 = await sendMessageWithRetry(chat, [
        {
          functionResponse: {
            name: functionName,
            response: { result: actionResponse },
          },
        },
      ]);

      return result2.response.text();
    }

    return response.text();
  } catch (error) {
    console.error("Error crítico en processUserMessage:", error);
    return "Lo siento, estoy recibiendo muchas consultas en este momento. ¿Podrías intentar de nuevo en unos segundos?";
  }
};
