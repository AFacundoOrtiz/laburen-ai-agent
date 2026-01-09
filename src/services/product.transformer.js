import { randomUUID } from "node:crypto";
import { generateSKU } from "../utils/skuGenerator.js"; // Importante la extensión .js
import { TextUtils, PriceUtils } from "../utils/formatters.js";

export class ProductTransformer {
  static mapRowToProduct(row) {
    const type = TextUtils.sanitize(row.TIPO_PRENDA);
    const color = TextUtils.sanitize(row.COLOR);
    const size = TextUtils.sanitize(row.TALLA?.toString());
    const fullName = `${type} ${color} (${size})`;
    const unitPrice = PriceUtils.calculateUnitPrice(row.PRECIO_50_U);

    return {
      uuid: randomUUID(),
      sku: generateSKU(fullName, unitPrice),
      name: fullName,
      description: TextUtils.sanitize(row.DESCRIPCIÓN),
      price: unitPrice,
      stock: parseInt(row.CANTIDAD_DISPONIBLE?.toString() || "0", 10) || 0,
      isAvailable: TextUtils.normalizeBoolean(row.DISPONIBLE),
      category: TextUtils.sanitize(row.CATEGORÍA) || "General",
      type,
      color,
      size,
    };
  }

  static generateUniqueKey(p) {
    return `${p.type}-${p.color}-${p.size}-${p.price.toFixed(2)}`.toUpperCase();
  }

  static processAndDeduplicate(rows) {
    const productsMap = new Map();

    for (const row of rows) {
      const newProduct = this.mapRowToProduct(row);
      const uniqueKey = this.generateUniqueKey(newProduct);

      if (!productsMap.has(uniqueKey)) {
        productsMap.set(uniqueKey, newProduct);
        continue;
      }

      const existingProduct = productsMap.get(uniqueKey);
      this.mergeProducts(existingProduct, newProduct);
    }

    return Array.from(productsMap.values());
  }

  static mergeProducts(existing, incoming) {
    existing.stock += incoming.stock;

    if (incoming.isAvailable) {
      existing.isAvailable = true;
    }

    if (incoming.description.length > existing.description.length) {
      existing.description = incoming.description;
    }
  }
}
