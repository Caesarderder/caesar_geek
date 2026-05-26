import { buildServer } from "./app.js";

const port = Number(process.env.PORT ?? 4387);
const host = process.env.HOST ?? "127.0.0.1";
const { fastify } = await buildServer();

await fastify.listen({ port, host });
