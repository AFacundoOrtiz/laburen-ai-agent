const BASE_URL = "http://localhost:3010/api";
const SIMULATED_USER_ID = "whatsapp_54911223344";

async function runTest() {
  console.log("INICIANDO TEST DE FLUJO DE COMPRA...\n");

  console.log("Buscando 'pantalón'...");
  const searchResponse = await fetch(
    `${BASE_URL}/products/search?query=pantalón`
  );
  const searchData = await searchResponse.json();

  if (!searchData.data || searchData.data.length === 0) {
    console.error("No se encontraron productos. Corre el seed primero.");
    return;
  }

  const firstProduct = searchData.data[0];
  console.log(
    `Producto encontrado: ${firstProduct.name} (ID: ${firstProduct.id})`
  );

  console.log("Agregando al carrito...");
  const addResponse = await fetch(`${BASE_URL}/cart/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      waId: SIMULATED_USER_ID,
      productId: firstProduct.id,
      quantity: 2,
    }),
  });
  const addData = await addResponse.json();

  if (addData.success) {
    console.log("Item agregado correctamente.");
  } else {
    console.error("Error agregando item:", addData);
  }

  console.log("Consultando carrito final...");
  const cartResponse = await fetch(`${BASE_URL}/cart/${SIMULATED_USER_ID}`);
  const cartData = await cartResponse.json();

  console.log("------------------------------------------------");
  console.log(`Carrito de: ${cartData.waId}`);
  console.log(`Total Calculado: $${cartData.total}`);
  console.log("Items:");
  cartData.items.forEach((item) => {
    console.log(
      `   - ${item.qty}x ${item.product.name} ($${item.product.price} c/u)`
    );
  });
  console.log("------------------------------------------------");
}

runTest();
