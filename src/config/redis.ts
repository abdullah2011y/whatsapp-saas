import Redis from "ioredis";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const redisConnection = new Redis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
});

redisConnection.on("connect", () => {
  console.log("[Redis] Connected successfully to Redis server");
});

redisConnection.on("error", (err) => {
  console.error("[Redis] Error connecting to Redis server:", err);
});
