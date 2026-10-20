import "dotenv/config";
function required(name) {
    const value = process.env[name];
    if (!value)
        throw new Error(`Missing required environment variable: ${name}`);
    return value;
}
export const config = {
    port: Number(process.env.PORT ?? 3000),
    pgUrl: required("DATABASE_URL"),
    openaiApiKey: required("OPENAI_API_KEY"),
    pgDb: process.env.POSTGRES_DB ?? "appdb",
    pgUser: process.env.POSTGRES_USER ?? "app",
    pgPassword: process.env.POSTGRES_PASSWORD ?? "devpassword"
};
//# sourceMappingURL=config.js.map