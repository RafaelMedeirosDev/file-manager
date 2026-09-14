import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
  resolve: {
    alias: {
      '@file-manager/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // O bloco de testes fica aqui, e nao num vitest.config.ts separado, para que
  // o alias de `@file-manager/shared` acima seja o mesmo nos dois. Dois
  // arquivos divergiriam em silencio, e o sintoma apareceria como modulo nao
  // encontrado num spec qualquer.
  test: {
    environment: 'jsdom',

    // Sem globals: cada spec importa { describe, it, expect, vi } de 'vitest'.
    // Mantem `types` do tsconfig fechado em ["vite/client"] -- e o preco esta
    // pago em src/test/setup.ts, que registra o cleanup da RTL a mao.
    globals: false,

    setupFiles: ['./src/test/setup.ts'],

    // src/services/api.ts LANCA no import se VITE_API_URL faltar, e todo spec
    // que toque authService, AuthContext ou uma pagina importa aquilo em
    // cadeia. O CI nao tem .env, e um .env.test tambem nao resolveria: o
    // .gitignore ignora `.env.*` negando so o .env.example.
    //
    // Definir aqui funciona porque o Vitest reescreve `import.meta.env` para um
    // Proxy sobre process.env e aplica test.env antes de qualquer import de
    // modulo. Tem precedencia sobre o .env local, entao o resultado nao depende
    // de como a maquina de quem roda esta configurada.
    env: {
      VITE_API_URL: 'http://localhost:3000',
    },

    clearMocks: true,
    restoreMocks: true,
  },
});
