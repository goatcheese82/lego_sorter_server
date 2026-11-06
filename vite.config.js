import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  base: './',
  plugins: [svelte()],
  optimizeDeps: { exclude: ['manifold-3d'] },
  build: { target: 'esnext' },
});
