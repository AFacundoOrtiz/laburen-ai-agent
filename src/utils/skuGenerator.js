/**
 * Función pura para generar un SKU inteligente
 * @param {string} name - Nombre del producto
 * @param {number|string} price - Precio del producto
 * @returns {string} SKU generado (Ej: SUD-BLA-1500)
 */
export function generateSKU(name, price) {
  const cleanName = name
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9\s]/g, "");

  const parts = cleanName.split(/\s+/);
  let prefix = parts[0].substring(0, 3);

  if (parts.length > 1) {
    prefix += `-${parts[1].substring(0, 3)}`;
  }

  const priceCode = Number(price).toFixed(2).replace(".", "");

  return `${prefix}-${priceCode}`;
}
