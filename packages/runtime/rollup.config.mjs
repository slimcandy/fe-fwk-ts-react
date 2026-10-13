import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";
import cleanup from "rollup-plugin-cleanup";
export default {
  input: "src/index.ts",
  plugins: [
    nodeResolve(),
    typescript({
      target: "ESNext",
      lib: ["ESNext", "DOM"],
      exclude: ["src/__tests__/**"],
    }),
    cleanup(),
  ],
  output: [
    {
      file: "dist/fe-fwk-ts-react.js",
      format: "esm",
      sourcemap: true,
      plugins: [terser()],
    },
  ],
};
