import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

if (!process.env.RENDER) {
  dotenv.config();
}

const usingDatabaseUrl = !!process.env.DATABASE_URL;

const pool = new Pool(
  usingDatabaseUrl
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT,
        ssl: false,
      }
);

pool
  .connect()
  .then(() =>
    console.log(
      "Connected to PostgreSQL via",
      usingDatabaseUrl ? "DATABASE_URL" : "local PG params"
    )
  )
  .catch((err) => console.error("PostgreSQL connection error:", err));

export default pool;
