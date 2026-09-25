import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "node:path";

const root = path.resolve(".");

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: [
      {
        // Swap the Deezer-backed playlist for a deterministic local stub.
        find: /^\.\/usePlaylist$/,
        replacement: path.join(root, ".artifacts/repro/usePlaylist.stub.ts"),
      },
      {
        // Real animations would make a round take ~20s of wall clock time.
        find: /^animejs$/,
        replacement: path.join(root, ".artifacts/repro/stage-round.stub-anime.js"),
      },
    ],
  },
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-stage-round",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: ".artifacts/repro/stage-round-repro.jsx",
      output: { entryFileNames: "stage-round-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
