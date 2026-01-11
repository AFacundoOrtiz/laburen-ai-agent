import * as productService from "../services/productService.js";
import * as cartService from "../services/cartService.js";

const WA_ID_TEST = "whatsapp:+123456789";

async function runTests() {
  console.log("Iniciando Tests de Herramientas...");

  console.log("1. Probando search_products('verano')...");
  const productos = await productService.searchProducts("verano");
  console.log(`   Encontrados: ${productos.length}\n`);

  if (productos.length > 0) {
    const idProducto = productos[0].id;

    console.log(`2. Probando add_to_cart(${idProducto})...`);
    const resultado = await cartService.addItemToCart(
      WA_ID_TEST,
      idProducto,
      1
    );
    console.log("Resultado:", resultado);
  } else {
    console.log("No se encontraron productos para probar el carrito.");
  }
}

runTests();
