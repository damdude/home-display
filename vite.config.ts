import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      onwarn(warning, defaultHandler) {
        if (warning.code.startsWith('a11y')) return;
        defaultHandler(warning);
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
