import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: "esnext",
    outDir: ".artifacts/repro/out-replay-route",
    emptyOutDir: true,
    minify: false,
    lib: {
      entry: ".artifacts/repro/replay-route-repro.jsx",
      formats: ["es"],
      fileName: () => "replay-route-repro.mjs",
    },
  },
});
