import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-cover-tap",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: ".artifacts/repro/cover-tap-repro.jsx",
      formats: ["es"],
      fileName: () => "cover-tap-repro.mjs",
    },
    rollupOptions: {
      external: [],
    },
  },
});
