import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "node:path";

const root = path.resolve(".");

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: [
      {
        find: /^\.\/usePlaylist$/,
        replacement: path.join(root, ".artifacts/repro/usePlaylist.stub.ts"),
      },
      {
        find: /^animejs$/,
        replacement: path.join(root, ".artifacts/repro/stage-round.stub-anime.js"),
      },
      {
        // Shortened but non-zero, so the reveal window can be observed while
        // it is still open. Two specifiers reach the real config from src:
        // "../config" and "../../config" (Cover).
        find: /^\.\.\/config$/,
        replacement: path.join(root, ".artifacts/repro/config.stub-reveal.ts"),
      },
      {
        find: /^\.\.\/\.\.\/config$/,
        replacement: path.join(root, ".artifacts/repro/config.stub-reveal.ts"),
      },
    ],
  },
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-auto-check",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: ".artifacts/repro/auto-check-repro.jsx",
      output: { entryFileNames: "auto-check-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
