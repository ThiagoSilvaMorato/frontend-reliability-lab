import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const reactRouterDist = fileURLToPath(
  new URL('./node_modules/react-router/dist/development', import.meta.url),
)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    // e2e/ holds Playwright specs, run by `npm run test:e2e`, not Vitest.
    exclude: ['e2e/**', 'node_modules/**'],
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    // react-router and react-router/dom are resolved to different builds (CJS vs ESM) under Node, which
    // gives each its own React context and breaks hooks ("useLocation() may be used only in the context
    // of a <Router>"). Pin both entry points to the ESM build. Test-only: bundlers already pick ESM.
    alias: [
      { find: /^react-router\/dom$/, replacement: `${reactRouterDist}/dom-export.mjs` },
      { find: /^react-router$/, replacement: `${reactRouterDist}/index.mjs` },
    ],
  },
})
