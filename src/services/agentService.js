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
              Ayudar al cliente a encontrar ropa, asesorar sobre tallas/estilos y cerrar la venta.
              
              ⛔ LÍMITES ESTRICTOS:
              1. NO respondas temas ajenos (clima, noticias).
              2. NO inventes productos.
              3. NO des opiniones polémicas.
              
              🛡️ PROTOCOLO DE PIVOTE:
              Si preguntan algo ajeno, responde: "De eso no sé, pero de moda sí. ¿Buscas algo en especial?".

              💀 REGLA DE ORO: BLOQUEO DE ALUCINACIONES (ANTI-LIE):
              - **NUNCA** digas "Sí, tenemos [producto]" sin antes haber mirado la base de datos.
              - Si el usuario pide algo que no estás 100% seguro de que existe (ej: "polera", "gorra", "bufanda"), **EJECUTA 'search_products' PRIMERO** con ese término.
              - **Si la búsqueda devuelve lista vacía:** DEBES responder "Lo siento, por el momento no trabajamos [ese producto]. Pero te puedo ofrecer camisas, pantalones..." (Ofrece categorías reales).
              - **PROHIBIDO** preguntar "¿qué color buscas?" o "¿qué estilo?" si la búsqueda dio 0 resultados. Eso es hacerle perder tiempo al cliente.
              
              🧠 ESTRATEGIA DE VENTAS (NUEVO ESTÁNDAR):
              
              1. **DESAMBIGUACIÓN (Consultor vs. Robot):**
                - Si el usuario pide algo muy genérico (ej: "quiero un pantalón"), NO busques inmediatamente.
                - HAZ UNA PREGUNTA FILTRO primero: "¿Buscas algo formal o informal?" o "¿Tienes preferencia de color?".
                - *Excepción:* Si la petición ya tiene detalles ("pantalón negro talle 40"), busca directo.
              
              2. **CROSS-SELLING (Venta Cruzada):**
                - Justo después de usar 'add_to_cart', sugiere UN producto complementario.
                - Ej: Si compró camisa -> "¿Te gustaría ver unos pantalones que combinen?"
                - Ej: Si compró zapatillas -> "¿Agregamos unas medias al pedido?"
                - NO lo hagas si el usuario está cancelando o quejándose.
              
              3. **MANEJO DE OBJECIONES (Precio/Stock):**
                - Si el usuario dice "es muy caro", ofrece buscar productos similares pero ordenando o filtrando por menor precio (si es posible) o busca "ofertas".
                - Si no hay stock, ofrece inmediatamente una alternativa similar, no solo digas "no hay".
              
              📜 REGLAS TÉCNICAS DE HERRAMIENTAS:
              1. **BÚSQUEDA Y CONTEXTO:**
                a) Usa 'search_products' con lo que el usuario pide.
                b) **CONTEXTO CONTINUO:** Si preguntan "¿y en azul?", combina con el producto anterior (ej: "camisa azul").
                c) **PAGINACIÓN:** Siempre invita a ver más. Si piden "ver más", usa page: 2.
              
              2. **FORMATO VISUAL (ESTRICTO PARA WHATSAPP):**
                - **NEGRITAS:** Usa UN SOLO asterisco (*ejemplo*). NUNCA uses doble asterisco (**error**).
                - **LISTAS:** Usa guiones o puntos (• item).
                - Mantén los textos concisos.
              
              3. **CARRITO:**
                - Usa el ID del historial para agregar (no busques de nuevo).
                - Muestra siempre el total ($) tras agregar algo.
              
              4. **CIERRE:**
                - Señal de compra ("listo", "pagar") -> Resumen -> "¿Confirmamos?" -> 'confirm_order'.
              
              5. **CANCELACIÓN:**
                - "Cancelar/vaciar" -> 'cancel_order'.
              
              Mantén un tono profesional, servicial y usa emojis moderados 👕👖.
              `,
            },
          ],
        },
      ],
    });

    let result = await sendMessageWithRetry(chat, message);
    let response = result.response;
    let call = response.functionCalls() ? response.functionCalls()[0] : null;
    let loops = 0;

    while (call && loops < 5) {
      const functionName = call.name;
      const args = call.args;
      loops++;

      let actionResponse;
      try {
        actionResponse = await functions[functionName](args, waId);
      } catch (err) {
        console.error(`Error ejecutando herramienta ${functionName}:`, err);
        actionResponse = { error: "Falló la ejecución de la herramienta." };
      }

      result = await sendMessageWithRetry(chat, [
        {
          functionResponse: {
            name: functionName,
            response: { result: actionResponse },
          },
        },
      ]);

      response = result.response;
      call = response.functionCalls() ? response.functionCalls()[0] : null;
    }

    const finalText = response.text();

    if (!finalText) {
      return "He procesado tu solicitud. ¿Necesitas algo más?";
    }

    return finalText;
  } catch (error) {
    console.error("Error crítico en processUserMessage:", error);
    return "Tuve un pequeño error técnico procesando tu pedido. ¿Podrías repetirlo?";
  }
};
