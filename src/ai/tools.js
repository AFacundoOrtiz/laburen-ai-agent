export const toolsDefinition = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description:
          "Busca productos. Soporta paginación para ver más resultados.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: { type: "STRING", description: "Término de búsqueda" },
            page: {
              type: "INTEGER",
              description: "Número de página (1, 2, etc.)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_product_details",
        description:
          "Obtiene la descripción completa, materiales y detalles de un producto específico usando su ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description:
                "El UUID del producto del cual se quieren ver detalles.",
            },
          },
          required: ["product_id"],
        },
      },
      {
        name: "add_to_cart",
        description:
          "Agrega un producto al carrito ACTIVO. Devuelve carrito actualizado.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: { type: "STRING", description: "UUID del producto" },
            quantity: { type: "INTEGER", description: "Cantidad" },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "update_cart_item",
        description: "Modifica cantidad de un producto o lo elimina (0).",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: { type: "STRING", description: "UUID del producto" },
            quantity: { type: "INTEGER", description: "Nueva cantidad" },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "confirm_order",
        description:
          "Cierra la venta (status COMPLETED). Solo tras confirmación.",
        parameters: { type: "OBJECT", properties: {} },
      },
      {
        name: "cancel_order",
        description: "Cancela el pedido actual (status CANCELED).",
        parameters: { type: "OBJECT", properties: {} },
      },
    ],
  },
];
