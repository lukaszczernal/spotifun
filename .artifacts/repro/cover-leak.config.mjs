import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-cover-leak",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: ".artifacts/repro/cover-leak-repro.jsx",
      formats: ["es"],
      fileName: () => "cover-leak-repro.mjs",
    },
    rollupOptions: {
      external: [],
    },
  },
});
