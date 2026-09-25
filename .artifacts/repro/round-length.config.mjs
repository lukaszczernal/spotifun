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
    ],
  },
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-round-length",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: ".artifacts/repro/round-length-repro.jsx",
      output: { entryFileNames: "round-length-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
