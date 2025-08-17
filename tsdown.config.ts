import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: {
        'long-run-command-mcp': './src/long-run-command-mcp.ts',
    },
    outDir: 'dist',
    format: 'esm',
    clean: true,
    sourcemap: false,
    minify: 'dce-only',
    treeshake: true,
    dts: {
        tsgo: true,
    },
    publint: true,
    unused: true,
    exports: true,
    nodeProtocol: true,
    define: {
        'import.meta.vitest': 'undefined',
    },
    external: [
        '@modelcontextprotocol/sdk',
        'dotenv',
        'zod',
    ],
    banner: {
        js: '#!/usr/bin/env node',
    },
    platform: 'node',
    target: 'node20',
});
