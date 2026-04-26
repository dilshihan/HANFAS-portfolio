import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        weddings: resolve(__dirname, 'weddings.html'),
        model: resolve(__dirname, 'model.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
});
