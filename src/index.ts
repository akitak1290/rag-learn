import "temporal-polyfill/full/global";

import { pool } from "./prisma/pool.js";
import { app } from "./chat/app.js";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { testConnection } from "./prisma/queries.js";
import type { Server } from "node:http";

let server: Server | undefined;

async function shutdown() {
  if (server) server.close();
  await pool.end();
}

(async () => {
  server = app.listen(config.port, "127.0.0.1", () => {
    logger.info(`app listening on port ${config.port}`);
  });

  server.on("error", (err) => {
    logger.error("Server error");
  });

  server.on("close", () => {
    logger.info("Server closed");
  });

})();

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
