import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePluginNode } from 'vite-plugin-node'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@scalar/shared/enums',
        replacement: path.resolve(__dirname, '../packages/shared/src/enums.ts'),
      },
      {
        find: '@scalar/shared/api',
        replacement: path.resolve(__dirname, '../packages/shared/src/api/index.ts'),
      },
      {
        find: '@scalar/shared/markdown',
        replacement: path.resolve(__dirname, '../packages/shared/src/markdown.ts'),
      },
      {
        find: /^@scalar\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../packages/shared/src/$1.ts'),
      },
    ],
  },
  server: {
    port: 3001,
    host: '0.0.0.0',
    allowedHosts: true,
    cors: true,
    watch: {
      usePolling: true,
    },
  },
  plugins: [
    ...VitePluginNode({
      adapter: 'express',
      appPath: './src/index.ts',
      exportName: 'viteNodeApp',
      tsCompiler: 'esbuild',
    }),
  ],
})
