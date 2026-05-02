import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import sitemap from "vite-plugin-sitemap";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    sitemap({
      hostname: "https://itcontracthub.co.uk",
      dynamicRoutes: ["/contracts", "/about", "/contact", "/contract-sources", "/upgrade", "/privacy", "/terms"],
      exclude: ["/login", "/signup", "/account", "/alerts", "/saved", "/reset-password", "/forgot-password"],
      changefreq: "daily",
      priority: {
        "/": 1.0,
        "/contracts": 0.9,
        "/about": 0.7,
        "/contact": 0.5,
      },
      lastmod: new Date().toISOString(),
      generateRobotsTxt: false,
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
