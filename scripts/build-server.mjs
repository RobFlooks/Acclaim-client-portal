import { build } from "esbuild";

await build({
  entryPoints: ["server/index.ts"],
  platform: "node",
  format: "esm",
  bundle: true,
  outdir: "dist",
  // leave these to be resolved from node_modules at runtime
  external: [
    "officegen",
    "lightningcss",
    "@babel/core",
    "@babel/preset-typescript",
    "readable-stream/*"
  ]
});