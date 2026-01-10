export const toolsDefinition = [
  {
    function_declarations: [
      {
        name: "search_products",
        description:
          "Busca productos en el catálogo basándose en el nombre, categoría o descripción. Útil cuando el usuario pregunta por disponibilidad o precios.",
        parameters: {
          type: "OBJECT",
          properties: {
            query: {
              type: "STRING",
              description:
                "La búsqueda del usuario. Ej: 'pantalón rojo', 'algo para correr'.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "add_to_cart",
        description:
          "Agrega un producto específico al carrito de compras del usuario. Se debe llamar SOLO cuando el usuario confirma explícitamente que quiere comprar.",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: {
              type: "STRING",
              description:
                "El UUID del producto a agregar (obtenido previamente de la búsqueda).",
            },
            quantity: {
              type: "NUMBER",
              description: "La cantidad de unidades a agregar.",
            },
          },
          required: ["productId", "quantity"],
        },
      },
      {
        name: "get_cart_info",
        description:
          "Obtiene el estado actual del carrito, items y total. Útil cuando el usuario pregunta '¿qué tengo en mi carrito?' o '¿cuánto debo?'.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "update_cart_item",
        description:
          "Modifica la cantidad de un producto que YA está en el carrito. Úsalo si el usuario quiere cambiar la cantidad o eliminar un item (cantidad 0).",
        parameters: {
          type: "OBJECT",
          properties: {
            productId: {
              type: "STRING",
              description: "El UUID del producto a modificar.",
            },
            quantity: {
              type: "NUMBER",
              description:
                "La nueva cantidad final deseada (ej: si tenía 2 y quiere 1, envía 1). Si quiere eliminar, envía 0.",
            },
          },
          required: ["productId", "quantity"],
        },
      },
      {
        name: "clear_cart",
        description:
          "Elimina TODOS los productos del carrito. Úsalo SOLO cuando el usuario pida explícitamente vaciar el carrito, borrar todo o cancelar su compra.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
];
