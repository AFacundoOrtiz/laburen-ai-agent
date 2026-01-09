import pg from "pg";
import fs from "fs";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const runInit = async () => {
  const client = await pool.connect();
  try {
    const sqlPath = path.resolve("db/init.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("DB inicializada.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
};

runInit();
