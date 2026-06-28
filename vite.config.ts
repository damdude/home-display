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
    watch: {
      // .env is rewritten live by the setup flow (writeEnvCredentials) to persist
      // HA credentials across reboots. Without this, Vite treats the change as a
      // config-relevant edit and restarts the dev server, dropping the HMR socket
      // and forcing a full page reload mid-setup (the "Connected!" blip).
      ignored: ['**/.env', '**/.env.*'],
    },
  },
});
