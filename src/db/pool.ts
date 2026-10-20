import { Pool } from "pg";
import { config } from "../config.js";

export const pool = new Pool({
  connectionString: config.pgUrl,
  max: 10,
  connectionTimeoutMillis: 5_000,
});