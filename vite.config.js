import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const productApiUrl = env.VITE_PRODUCTS_API_URL
    || 'https://uatproductqr.sysdevpghc.net/api/products'
  const productAssetTarget = new URL(productApiUrl).origin

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/product-assets': {
          target: productAssetTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/product-assets/, '/assets'),
        },
      },
    },
  }
})
