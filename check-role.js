import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query('SELECT email, role FROM "User";');
    console.table(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
