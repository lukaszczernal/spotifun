import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
export default defineConfig({
  plugins: [solid({ solid: { generate: "dom", hydratable: false } })],
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out",
    emptyOutDir: true,
    minify: false,
    sourcemap: false,
    rollupOptions: {
      input: ".artifacts/repro/reveal-order-repro.jsx",
      output: { entryFileNames: "reveal-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
