import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
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
            'node_modules/**',
            'components/MyTickets.tsx',
            'components/ReportsSection.tsx',
            'components/SuperAdminDashboard.tsx',
            'components/TaskCard.tsx',
            'components/UserTicketCreation.tsx',
            'services/PushNotificationService.ts'
          ],
          reporter: ['text', 'json', 'json-summary', 'html'],
          reportsDirectory: './coverage',
          thresholds: {
            lines: 90,
            statements: 90
          }
        }
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
          '@/components': path.resolve(__dirname, 'src/components'),
          '@/services': path.resolve(__dirname, 'src/services'),
          '@/utils': path.resolve(__dirname, 'src/utils'),
          '@/types': path.resolve(__dirname, 'src/types'),
          '@/config': path.resolve(__dirname, 'src/config'),
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
