import { functionsMap } from "../ai/functions.js";

export const handleMockMode = async (waId, message) => {
  const isTestPrefix = message.startsWith("test_");
  const isEnvMock = process.env.USE_MOCK === "true";

  if (!isTestPrefix && !isEnvMock) {
    return null;
  }

  console.log("MOCK MODE ACTIVADO: Saltando llamada a Gemini...");

  const lowerMsg = message.toLowerCase();

  try {
    // CASO 1: BÚSQUEDA
    if (lowerMsg.includes("buscar")) {
      const queryRaw = message.replace(/test_|buscar/gi, "").trim();
      const query = queryRaw || "pantalón";

      const results = await functionsMap.search_products({ query, page: 1 });

      if (!results || results.length === 0) {
        return `[MOCK] Búsqueda de "${query}" retornó 0 resultados.`;
      }

      const list = results
        .slice(0, 5)
        .map((p) => `• *${p.name}* - $${p.price} (Stock: ${p.stock})`)
        .join("\n");

      return `[MOCK] Busqué: "${query}"\nResultados encontrados:\n${list}`;
    }

    // CASO 2: COMPRA (Hardcodeada)
    if (lowerMsg.includes("comprar")) {
      const MOCK_PRODUCT_ID = "010c5b13-a4fa-4ec6-83af-6371dba8aab5";

      const response = await functionsMap.add_to_cart(
        { product_id: MOCK_PRODUCT_ID, quantity: 1 },
        waId
      );

      return `[MOCK Compra]:\n${JSON.stringify(response, null, 2)}`;
    }

    // CASO 3: CONFIRMAR ORDEN
    if (lowerMsg.includes("confirmar")) {
      const response = await functionsMap.confirm_order({}, waId);
      return `[MOCK Confirmar]:\n${JSON.stringify(response, null, 2)}`;
    }

    // CASO 4: VACIAR/CANCELAR CARRITO
    if (lowerMsg.includes("vaciar") || lowerMsg.includes("cancelar")) {
      const response = await functionsMap.cancel_order({}, waId);
      return `[MOCK Cancelar]:\n${JSON.stringify(response, null, 2)}`;
    }

    return `[MOCK] Comandos disponibles:\n- 'test_ buscar [producto]'\n- 'test_ comprar'\n- 'test_ confirmar'\n- 'test_ vaciar'`;
  } catch (error) {
    console.error("❌ Error en Mock Handler:", error);
    return `[MOCK ERROR]: Ocurrió una excepción ejecutando el comando.\n${error.message}`;
  }
};
