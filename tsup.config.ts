import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  minify: false,
  // Inject a per-format `require` shim so the synchronous webhook
  // signing path can lazily resolve `node:crypto` from ESM as well as
  // CJS. Runtimes without `node:crypto` simply have a no-op shim and
  // users fall back to `constructEventAsync`.
  banner: ({ format }) => ({
    js:
      format === 'esm'
        ? "import { createRequire as __createRequire } from 'node:module'; const __sdkRequire = (() => { try { return __createRequire(import.meta.url); } catch { return undefined; } })();"
        : 'const __sdkRequire = require;',
  }),
});
