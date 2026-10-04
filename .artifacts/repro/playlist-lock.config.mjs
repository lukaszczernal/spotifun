import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "node:path";

const root = path.resolve(".");

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: [
      {
        // The route half mounts the real Stage; swap the Deezer-backed playlist
        // for a deterministic local stub so no network access is needed.
        find: /^\.\/usePlaylist$/,
        replacement: path.join(
          root,
          ".artifacts/repro/usePlaylist.fixed.stub.ts",
        ),
      },
      {
        // Real animations drive off requestAnimationFrame and cost wall clock.
        find: /^animejs$/,
        replacement: path.join(
          root,
          ".artifacts/repro/stage-round.stub-anime.js",
        ),
      },
      {
        // Collapse the reveal delays. Two specifiers reach the real config from
        // src: "../config" and "../../config" (Cover).
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
    outDir: ".artifacts/repro/out-playlist-lock",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: ".artifacts/repro/playlist-lock-repro.jsx",
      output: { entryFileNames: "playlist-lock-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
