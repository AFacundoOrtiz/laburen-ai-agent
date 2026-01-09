import pg from "pg";
const { Pool } = pg;

export class DatabaseService {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  async close() {
    await this.pool.end();
  }

  async saveProducts(products) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      await client.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");

      const insertQuery = `
        INSERT INTO products (
          id, sku, name, description, price, stock, category, is_available, 
          type, color, size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `;

      for (const p of products) {
        await client.query(insertQuery, [
          p.uuid,
          p.sku,
          p.name,
          p.description,
          p.price,
          p.stock,
          p.category,
          p.isAvailable,
          p.type,
          p.color,
          p.size,
        ]);
      }

      await client.query("COMMIT");
      console.log("Transacción completada");
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Error en DB: ${error.message}`);
    } finally {
      client.release();
    }
  }
}
