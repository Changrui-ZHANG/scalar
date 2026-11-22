import type { IncomingMessage } from 'node:http'
import type { Duplex } from 'node:stream'

import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { VitePluginNode } from 'vite-plugin-node'

type Upgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => void

// Vite possede le serveur HTTP en dev : sans ce relais, le WebSocket de l'API n'y serait jamais servi.
// Il ne prend que /api/v1/ws ; le HMR de Vite garde ses propres poignees de main.
const realtime = (): Plugin => ({
  name: 'scalar-realtime',
  configureServer(server) {
    server.httpServer?.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      if (!req.url?.startsWith('/api/v1/ws')) {
        return
      }
      server
        .ssrLoadModule('./src/main.ts')
        .then((mod) => (mod.realtimeUpgrade as Upgrade)(req, socket, head))
        .catch(() => socket.destroy())
    })
  },
})

export default defineConfig({
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
    realtime(),
    ...VitePluginNode({
      adapter: 'express',
      appPath: './src/main.ts',
      exportName: 'viteNodeApp',
      tsCompiler: 'esbuild',
    }),
  ],
})
