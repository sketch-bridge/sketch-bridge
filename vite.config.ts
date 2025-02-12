import {defineConfig, loadEnv, Plugin} from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [envPlugin(), react()],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
});

function envPlugin(): Plugin {
  return {
    name: 'env-plugin',
    config(_, {mode}) {
      const env = loadEnv(mode, '.', ['SKETCH_BRIDGE_', 'NODE_ENV']);
      return {
        define: Object.fromEntries(
          Object.entries(env).map(([key, value]) =>
            [
              `import.meta.env.${key}`,
              JSON.stringify(value),
            ]
          )
        ),
      };
    },
  };
}
