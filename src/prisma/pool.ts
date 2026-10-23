import { Pool } from "pg";
import { config } from "../config.js";

// raw db connection for querying vector store ONLY
export const pool = new Pool({
  connectionString: config.pgUrl,
  max: 10,
  connectionTimeoutMillis: 5_000,
});