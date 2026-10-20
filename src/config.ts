import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function buildUrl(base: string, args: Record<string, string>): string {
  let result = base;
  const regex = new RegExp(Object.keys(args).join("|"), "g");
  result = result.replace(regex, (matched) => args[matched]!);
  return result;
}

// DON'T USE THE DEFAULT CREDENTIALS, UPDATE ENV
const pgDb = process.env.POSTGRES_DB ?? "appdb";
const pgUser = process.env.POSTGRES_USER ?? "app";
const pgPassword = process.env.POSTGRES_PASSWORD ?? "devpassword";
const pgPort = process.env.DB_PORT ?? "5432";

export const config = {
  port: Number(process.env.PORT ?? 3000),
  pgUrl: required("DATABASE_URL") && buildUrl(process.env.DATABASE_URL!, {
    "USERNAME": pgUser,
    "PASSWORD": pgPassword,
    "PORT": pgPort
  }),
  openaiApiKey: required("OPENAI_API_KEY"),
  openaiModerationApiKey: required("OPENAI_MODERATION_API_KEY"),
  openaiModel: required("OPENAI_MODEL"),
  openaiBaseUrl: required("OPENAI_BASE_URL"),
  pgDb,
  pgUser,
  pgPassword
};
