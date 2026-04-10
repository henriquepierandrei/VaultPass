import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: resolve(__dirname, 'src/main/main.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/main'),
            rollupOptions: {
              external: ['electron', 'electron-store', 'crypto', 'fs', 'path', 'os', 'net', 'better-sqlite3'],
            },
            lib: {
              formats: ['cjs'],
            },
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
              '@main': resolve(__dirname, 'src/main'),
            },
          },
        },
      },
      {
        entry: resolve(__dirname, 'src/preload/preload.ts'),
        vite: {
          build: {
            outDir: resolve(__dirname, 'dist/preload'),
            lib: {
              formats: ['cjs'],
            },
          },
          resolve: {
            alias: {
              '@shared': resolve(__dirname, 'src/shared'),
              '@preload': resolve(__dirname, 'src/preload'),
            },
          },
        },
      },
    ]),
    renderer(),
    {
      name: 'copy-assets',
      closeBundle() {
        const assetsDir = resolve(__dirname, 'dist/renderer/assets');
        const srcAssetsDir = resolve(__dirname, 'assets');
        
        if (!existsSync(assetsDir)) {
          mkdirSync(assetsDir, { recursive: true });
        }
        
        if (existsSync(srcAssetsDir)) {
          const files = ['logo.png'];
          files.forEach(file => {
            const src = resolve(srcAssetsDir, file);
            const dest = resolve(assetsDir, file);
            if (existsSync(src)) {
              copyFileSync(src, dest);
              console.log(`Copied ${file} to dist/renderer/assets`);
            }
          });
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer'),
      '@main': resolve(__dirname, 'src/main'),
      '@preload': resolve(__dirname, 'src/preload'),
    },
  },
  root: 'src/renderer',
  publicDir: '../../public',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
