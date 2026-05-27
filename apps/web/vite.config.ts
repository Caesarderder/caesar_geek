import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiTarget = process.env.VITE_API_TARGET ?? "http://127.0.0.1:4387";
const webPort = Number(process.env.WEB_PORT ?? 5623);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    proxy: {
      "/trpc": apiTarget,
      "/events": apiTarget
    }
  }
});
