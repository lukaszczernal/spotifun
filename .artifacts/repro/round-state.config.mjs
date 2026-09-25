import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-round-state",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: ".artifacts/repro/round-state-repro.jsx",
      output: { entryFileNames: "round-state-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
