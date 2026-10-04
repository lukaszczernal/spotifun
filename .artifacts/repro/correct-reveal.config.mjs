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
        // Records every timeline step instead of driving rAF, so the shape of
        // the correct-answer record animation can be read back.
        find: /^animejs$/,
        replacement: path.join(root, ".artifacts/repro/correct-reveal.stub-anime.js"),
      },
      {
        find: /^\.\.\/config$/,
        replacement: path.join(root, ".artifacts/repro/config.stub.ts"),
      },
      {
        find: /^\.\.\/\.\.\/config$/,
        replacement: path.join(root, ".artifacts/repro/config.stub.ts"),
      },
    ],
  },
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-correct-reveal",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: ".artifacts/repro/correct-reveal-repro.jsx",
      output: { entryFileNames: "correct-reveal-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
