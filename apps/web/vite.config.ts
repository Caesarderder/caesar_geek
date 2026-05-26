import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5623,
    proxy: {
      "/trpc": "http://127.0.0.1:4387",
      "/events": "http://127.0.0.1:4387"
    }
  }
});
