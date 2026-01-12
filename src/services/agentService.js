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
          "Agrega un producto al carrito ACTIVO. Devuelve el carrito actualizado con el total.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description: "ID del producto a agregar (UUID)",
            },
            quantity: { type: "INTEGER", description: "Cantidad a agregar" },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "update_cart_item",
        description:
          "Modifica la cantidad de un producto en el carrito activo o lo elimina (cantidad 0).",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description: "ID del producto a modificar",
            },
            quantity: {
              type: "INTEGER",
              description: "Nueva cantidad total (0 para borrar)",
            },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "confirm_order",
        description:
          "CIERRA la venta. Cambia el estado del carrito a COMPLETED. Usar SOLO tras confirmación explícita del usuario.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "cancel_order",
        description:
          "CANCELA el pedido actual y cambia el estado a CANCELED. Usar si el usuario se arrepiente de todo.",
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
  confirm_order: async ({}, waId) => {
    return await cartService.confirmOrder(waId);
  },
  cancel_order: async ({}, waId) => {
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
  if (message.startsWith("test_") || process.env.USE_MOCK === "true") {
    console.log("TEST ACTIVADO: Saltando llamada a Gemini...");

    if (message.toLowerCase().includes("buscar")) {
      const queryReal = message.replace(/test_|buscar/gi, "").trim();
      const queryFinal = queryReal || "pantalón";
      const actionResponse = await functions.search_products({
        query: queryFinal,
      });
      const topItems = actionResponse.slice(0, 5);
      const listText = topItems
        .map((p) => `• ${p.name} ($${p.price})`)
        .join("\n");
      return `[MOCK] Busqué: "${queryFinal}"\nResultados: ${actionResponse.length}\n${listText}`;
    }
    if (message.toLowerCase().includes("comprar")) {
      const mockUuid = "010c5b13-a4fa-4ec6-83af-6371dba8aab5";
      const actionResponse = await functions.add_to_cart(
        { product_id: mockUuid, quantity: 1 },
        waId
      );
      return `[MOCK Compra]: ${JSON.stringify(actionResponse, null, 2)}`;
    }
    if (message.toLowerCase().includes("confirmar")) {
      const actionResponse = await functions.confirm_order({}, waId);
      return `[MOCK Confirmar]: ${JSON.stringify(actionResponse, null, 2)}`;
    }
    if (message.toLowerCase().includes("vaciar")) {
      const actionResponse = await functions.cancel_order({}, waId);
      return `[MOCK Cancelar]: ${JSON.stringify(actionResponse, null, 2)}`;
    }
    return "[MOCK] Comandos: 'test_ buscar', 'test_ comprar', 'test_ confirmar', 'test_ vaciar'";
  }

  try {
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [
            {
              text: `
            Eres "LaburenBot", el vendedor estrella de la tienda de ropa "Laburen". Tu objetivo es vender y fidelizar.
            
            ⚠️ REGLAS MAESTRAS DE COMPORTAMIENTO:
            
            1. **BÚSQUEDA INTELIGENTE:**
               - Usa 'search_products' con lo que el usuario pide.
               - NO inventes productos. Si la búsqueda viene vacía, ofrece categorías generales.
            
            2. **PRESENTACIÓN DE PRODUCTOS:**
               - Muestra: Nombre, Precio y (importante) si hay Stock.
               - JAMÁS muestres el ID (UUID) al usuario. Eso es solo para tu uso interno en las funciones.
            
            3. **MANEJO DEL CARRITO (Add/Update):**
               - Cuando el usuario diga "quiero ese", usa 'add_to_cart'.
               - La herramienta te devolverá el carrito actualizado con el TOTAL a pagar. ¡Muestra ese total al usuario!
               - Si pide cambiar tallas o cantidades, usa 'update_cart_item'.
            
            4. **CIERRE DE VENTA (ESTRICTO):**
               - Si el usuario dice "listo", "quiero pagar" o "¿cuánto es?":
                 a) Muestra el resumen final de lo que tiene.
                 b) Pregunta explícitamente: "¿Confirmamos el pedido?".
                 c) SOLO si responde "SÍ" (o similar), ejecuta 'confirm_order'.
                 d) Una vez confirmado, despídete y diles que pronto recibirán el link de pago.
            
            5. **CANCELACIONES:**
               - Si el usuario dice "cancelar todo", "no quiero nada" o "vaciar", ejecuta 'cancel_order'.
            
            ¡Sé amable, breve y efectivo!
            `,
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

      console.log(`IA ejecuta: ${functionName}`, args);

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
    return "Tuve un pequeño error técnico. ¿Podrías repetirme eso?";
  }
};
