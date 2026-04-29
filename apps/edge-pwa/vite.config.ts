import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {
          src: '../../circuits/build/*',
          dest: 'circuits'
        }
      ]
    })
  ],
  test: {
    // Use jsdom so that localStorage, window, crypto.subtle etc. are available
    environment: 'jsdom',
    globals: true,
    include: ['src/tests/**/*.test.ts'],
    // Ensure snarkjs WASM can be dynamically imported in tests
    server: {
      deps: {
        fallbackCJS: true,
      },
    },
  },
})
