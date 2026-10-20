import { pool } from "./db/pool.js";
import { app } from "./chat/app.js";
import { config } from "./config.js";
import { testConnection } from "./db/queries.js";
// await pool.query("SELECT 1");
let server;
async function shutdown() {
    if (server)
        server.close();
    await pool.end();
}
(async () => {
    server = app.listen(config.port);
    // test connection
    try {
        const result = await pool.query(testConnection);
        console.log("Connect to PostgresSQL: ", result.rows);
    }
    finally {
        await shutdown();
    }
})();
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
//# sourceMappingURL=index.js.map