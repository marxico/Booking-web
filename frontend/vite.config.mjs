import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  root: path.resolve("frontend"),
  publicDir: path.resolve("public"),
  plugins: [react()],
  build: {
    outDir: path.resolve("frontend", "dist"),
    emptyOutDir: true
  }
});
