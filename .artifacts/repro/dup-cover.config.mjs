import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import path from "node:path";

const root = path.resolve(".");

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: [
      {
        // Playlist where several tracks share an album, as Deezer returns.
        find: /^\.\/usePlaylist$/,
        replacement: path.join(root, ".artifacts/repro/dup-cover.stub.ts"),
      },
    ],
  },
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-dup-cover",
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      input: ".artifacts/repro/dup-cover-repro.jsx",
      output: { entryFileNames: "dup-cover-bundle.mjs", format: "es" },
      preserveEntrySignatures: "strict",
    },
  },
});
