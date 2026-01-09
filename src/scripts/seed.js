import dotenv from "dotenv";
import path from "path";
import { ExcelService } from "../services/excel.service.js";
import { ProductTransformer } from "../services/product.transformer.js";
import { DatabaseService } from "../services/database.service.js";

dotenv.config();

const runSeed = async () => {
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL no está definida en .env");
    process.exit(1);
  }

  const dbService = new DatabaseService(process.env.DATABASE_URL);

  const FILE_PATH = path.resolve("products.xlsx");

  try {
    console.log("Iniciando seeder...");

    console.log(`Leyendo archivo: ${FILE_PATH}`);
    const rawRows = ExcelService.loadData(FILE_PATH);
    console.log(`Filas leídas: ${rawRows.length}`);

    const products = ProductTransformer.processAndDeduplicate(rawRows);
    console.log(`Productos a insertar: ${products.length}`);

    console.log("Insertando en DB...");
    await dbService.saveProducts(products);

    console.log("Proceso finalizado");
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  } finally {
    await dbService.close();
  }
};

runSeed();
