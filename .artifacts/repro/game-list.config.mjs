import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-game-list",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: ".artifacts/repro/game-list-repro.jsx",
      formats: ["es"],
      fileName: () => "game-list-repro.mjs",
    },
    rollupOptions: {
      external: [],
    },
  },
});
