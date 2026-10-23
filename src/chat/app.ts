import express from "express";
import chatRouter from "./routes.js";
import { pool } from "../prisma/pool.js";
import { testConnection } from "../prisma/queries.js";
import { logger } from "../utils/logger.js";
import { requestLogger } from "./middleware.js";

export const app = express();

app.use(requestLogger);
app.use(express.json());

app.use("/healthcheck", async (_, res) => {
  let dbStatus;
  try {
    await pool.query(testConnection);
    dbStatus = "ok";
  } catch (err) {
    logger.error(`PG pool connection error: ${err}`);
    dbStatus = "error";
  }

  res.status(200).send({
    dbStatus,
  });
});
app.use("/chat", chatRouter);
