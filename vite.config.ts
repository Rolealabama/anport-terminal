import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: env.VITE_BASE_PATH || '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      test: {
        environment: 'jsdom',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/unit/**/*.test.{ts,tsx}'],
        exclude: ['tests/e2e/**', 'node_modules/**'],
        coverage: {
          provider: 'v8',
          all: true,
          include: [
            'components/**/*.{ts,tsx}',
            'services/**/*.ts',
            'config/**/*.ts',
            'firebase.ts',
            'utils.ts'
          ],
          exclude: [
            '**/*.d.ts',
            '**/*.test.*',
            'tests/**',
            'functions/**',
            'scripts/**',
            'dist/**',
            'coverage/**',
            'node_modules/**'
          ],
          reporter: ['text', 'json', 'json-summary', 'html'],
          reportsDirectory: './coverage',
          thresholds: {
            lines: 60,
            statements: 60
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@/components': path.resolve(__dirname, 'components'),
          '@/services': path.resolve(__dirname, 'services'),
          '@/utils': path.resolve(__dirname, '.'),
          '@/types': path.resolve(__dirname, '.'),
          '@/config': path.resolve(__dirname, 'config'),
        }
      },
      build: {
        sourcemap: process.env.NODE_ENV !== 'production' ? true : false,
        rollupOptions: {
          output: {
            assetFileNames: (assetInfo) => {
              if (assetInfo.name?.endsWith('.map')) {
                return 'sourcemaps/[name][extname]';
              }
              return 'assets/[name][extname]';
            },
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js'
          }
        }
      }
    };
});
