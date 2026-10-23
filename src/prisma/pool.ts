import { Pool } from "pg";
import { config } from "../config.js";

// DEPRECATED, used to test connection
export const pool = new Pool({
  connectionString: config.pgUrl,
  max: 10,
  connectionTimeoutMillis: 5_000,
});