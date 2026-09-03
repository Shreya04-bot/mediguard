import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Real bug found and fixed during development: src/lib/axios.js and
    // .env both default VITE_API_BASE_URL to a relative "/api" (or
    // "/api/v1"), with a comment saying this "assumes the backend is
    // reverse-proxied under the same origin during dev" — but no such
    // proxy was ever actually configured here. Without it, every API
    // call from `npm run dev` (port 5173) resolved to
    // http://localhost:5173/api/... instead of the backend on 8000,
    // which doesn't exist there — every request would 404. This proxy
    // is what makes the documented "two terminals, npm run dev + uvicorn"
    // workflow in docs/MANUAL_RUN_GUIDE.md actually work.
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-motion": ["framer-motion"],
          "vendor-charts": ["recharts"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
})