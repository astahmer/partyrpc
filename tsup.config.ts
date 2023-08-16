import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/client.ts", "src/react.ts", "src/server.ts"],
  outDir: "dist",
  clean: true,
  format: ["esm", "cjs"],
  dts: true,
});
