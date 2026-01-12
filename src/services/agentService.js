import { GoogleGenerativeAI } from "@google/generative-ai";
import * as productService from "./productService.js";
import * as cartService from "./cartService.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const tools = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description:
          "Busca productos. Soporta paginación para ver más resultados.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description: "Término de búsqueda",
            },
            page: {
              type: "INTEGER",
              description:
                "Número de página (1 para los primeros resultados, 2 para ver más, etc.)",
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
  search_products: async ({ query, page = 1 }) => {
    const products = await productService.searchProducts(query, page);

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      stock: p.stock,
    }));
  },
  add_to_cart: async ({ product_id, quantity }, waId) => {
    const result = await cartService.addItemToCart(waId, product_id, quantity);
    return {
      success: result.success,
      message: result.message,
      total_items: result.cartId ? "Items actualizados" : "0",
    };
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
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
      },
      history: [
        {
          role: "user",
          parts: [
            {
              text: `
            ACTÚA COMO: "LaburenBot", el vendedor experto y carismático de la tienda de ropa "Laburen".
            
            🎯 TU OBJETIVO PRINCIPAL:
            Ayudar al cliente a encontrar ropa, asesorar sobre tallas/estilos y cerrar la venta usando el carrito.
            
            ⛔ LÍMITES ESTRICTOS (LO QUE NO DEBES HACER):
            1. **NO eres un asistente general.** No respondas preguntas sobre historia, matemáticas, código, clima, noticias, deportes o cualquier tema ajeno a la tienda.
            2. **NO inventes productos.** Solo vende lo que encuentres con la herramienta 'search_products'.
            3. **NO des opiniones personales** controversiales.
            
            🛡️ PROTOCOLO DE RESPUESTA A TEMAS AJENOS (TÉCNICA DE PIVOTE):
            Si el usuario pregunta algo fuera de lugar (ej: "¿Quién ganó el mundial?", "Escribe un poema"), DEBES rechazar amablemente la respuesta y redirigir la conversación a la ropa.
            
            Ejemplos de Pivote:
            - Usuario: "¿Cuánto es 2+2?"
            - Tú: "Soy experto en sumas, pero solo cuando sumo descuentos en camisetas. ¿Buscas alguna en especial?"
            
            - Usuario: "¿Qué opinas del presidente?"
            - Tú: "Mi política es simple: vestir bien a la gente. Hablando de eso, tengo unas chaquetas nuevas increíbles..."
            
            📜 REGLAS DE HERRAMIENTAS:
            1. **BÚSQUEDA INTELIGENTE Y PAGINACIÓN:**
               - Usa 'search_products' con lo que el usuario pide (default page 1).
               - **SIEMPRE invita a seguir viendo:** "¿Te gusta alguno o quieres ver más modelos?".
               - Si piden "ver más", usa la misma query con page: 2.
            
            2. **PRESENTACIÓN:**
               - Muestra Nombre, Precio y si hay Stock.
               - JAMÁS muestres UUIDs.
            
            3. **CARRITO:**
               - Usa 'add_to_cart' cuando confirmen interés. Muestra el total actualizado.
               - Usa 'update_cart_item' para cambios.
            
            4. **CIERRE (Confirmación):**
               - Si dicen "comprar/pagar": Muestra resumen -> Pregunta "¿Confirmamos?" -> Si SÍ: Ejecuta 'confirm_order'.
            
            5. **CANCELACIÓN:**
               - Si dicen "cancelar/vaciar": Ejecuta 'cancel_order'.
            
            Mantén un tono profesional pero cercano, con emojis ocasionales 👕.
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
