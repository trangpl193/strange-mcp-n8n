import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    shims: true,
    banner: {
      js: '#!/usr/bin/env node',
    },
  },
  {
    entry: ['src/cli-sdk.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: false,
    shims: true,
    // No banner for cli-sdk (will be run with 'node' command)
  },
]);
