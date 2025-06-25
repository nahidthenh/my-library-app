import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true
    }),
    // Bundle analyzer (only in analyze mode)
    process.env.ANALYZE && visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Optimize minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },

    // PWA optimizations
    rollupOptions: {
      output: {
        // Advanced code splitting strategy
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor'
            }
            // Firebase
            if (id.includes('firebase')) {
              return 'firebase'
            }
            // Charts
            if (id.includes('recharts')) {
              return 'charts'
            }
            // HTTP client
            if (id.includes('axios')) {
              return 'http'
            }
            // Other vendor libraries
            return 'vendor'
          }

          // App chunks
          if (id.includes('/pages/')) {
            return 'pages'
          }
          if (id.includes('/components/')) {
            return 'components'
          }
        },

        // Optimize chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const fileName = path.basename(facadeModuleId, path.extname(facadeModuleId))
            return `assets/[name]-[hash].js`
          }
          return 'assets/[name]-[hash].js'
        },

        // Optimize asset naming
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        }
      }
    },

    // Enable source maps for debugging (disable in production)
    sourcemap: process.env.NODE_ENV !== 'production',

    // Optimize chunk size
    chunkSizeWarningLimit: 500,

    // Enable CSS code splitting
    cssCodeSplit: true,

    // Optimize CSS
    cssMinify: true
  },

  // PWA service worker
  define: {
    __SW_ENABLED__: true,
    __DEV__: process.env.NODE_ENV === 'development'
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios'
    ],
    exclude: [
      'firebase/analytics'
    ]
  }
})