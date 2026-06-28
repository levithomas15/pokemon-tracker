import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serviert die App unter /pokemon-tracker/.
// Im Dev (command === "serve") bleibt der Basis-Pfad "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/pokemon-tracker/" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    open: true,
  },
}));
