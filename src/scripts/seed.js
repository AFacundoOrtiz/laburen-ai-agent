import dotenv from "dotenv";
import path from "path";
import prisma from "../config/prisma.js";
import { ExcelService } from "../services/excel.service.js";
import { ProductTransformer } from "../services/product.transformer.js";

dotenv.config();

const runSeed = async () => {
  const FILE_PATH = path.resolve("products.xlsx");

  try {
    console.log("Iniciando seeder con Prisma...");
    console.log(`   Leyendo archivo: ${FILE_PATH}`);
    const rawRows = ExcelService.loadData(FILE_PATH);
    console.log(`   Filas encontradas: ${rawRows.length}`);

    const products = ProductTransformer.processAndDeduplicate(rawRows);
    console.log(`   Productos procesados (deduplicados): ${products.length}`);

    await prisma.$transaction(async (tx) => {
      console.log("Limpiando tabla de productos...");
      await tx.$executeRawUnsafe(
        `TRUNCATE TABLE products RESTART IDENTITY CASCADE;`
      );

      console.log("Insertando productos en DB...");

      await tx.product.createMany({
        data: products.map((p) => ({
          id: p.uuid,
          sku: p.sku,
          name: p.name,
          description: p.description,
          price: p.price,
          stock: p.stock,
          isAvailable: p.isAvailable,
          category: p.category,
          type: p.type,
          color: p.color,
          size: p.size,
        })),
        skipDuplicates: true,
      });
    });

    console.log("Proceso finalizado con éxito.");
  } catch (err) {
    console.error("Error fatal en el seeder:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

runSeed();
