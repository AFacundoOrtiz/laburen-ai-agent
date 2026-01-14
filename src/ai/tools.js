export const toolsDefinition = [
  {
    functionDeclarations: [
      {
        name: "search_products",
        description:
          "Busca productos en la base de datos. Úsalo para buscar por nombre ('zapatillas'), por intención ('algo barato') o categorías. Soporta paginación y ordenamiento.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description:
                "Término de búsqueda. Ej: 'pantalón', 'negro'. Si el usuario pide 'algo barato' sin especificar producto, envía un string vacío ''.",
            },
            page: {
              type: "INTEGER",
              description:
                "Número de página para ver más resultados (default: 1).",
            },
            sort: {
              type: "STRING",
              description:
                "Criterio de orden. Usa 'price_asc' si el usuario pide 'barato', 'económico' o 'menor precio'. Usa 'relevance' por defecto.",
              enum: ["price_asc", "relevance"],
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_product_details",
        description:
          "Obtiene la descripción completa, materiales, stock exacto y detalles de un producto específico usando su ID.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description: "El UUID del producto a consultar.",
            },
          },
          required: ["product_id"],
        },
      },
      {
        name: "add_to_cart",
        description:
          "Agrega un producto al carrito de compras. Requiere el ID del producto y la cantidad.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description: "UUID del producto a agregar.",
            },
            quantity: {
              type: "INTEGER",
              description: "Cantidad de unidades a agregar.",
            },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "update_cart_item",
        description:
          "Modifica la cantidad de un producto que YA está en el carrito. Usar cantidad 0 para eliminar.",
        parameters: {
          type: "OBJECT",
          properties: {
            product_id: {
              type: "STRING",
              description: "UUID del producto en el carrito.",
            },
            quantity: {
              type: "INTEGER",
              description: "Nueva cantidad deseada.",
            },
          },
          required: ["product_id", "quantity"],
        },
      },
      {
        name: "confirm_order",
        description:
          "Cierra la venta y cambia el estado del carrito a COMPLETED. Usar solo cuando el usuario confirma explícitamente.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "cancel_order",
        description:
          "Cancela el pedido actual y vacía el carrito (status CANCELED).",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
];
