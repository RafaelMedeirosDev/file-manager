/// <reference types="vite/client" />

// Sem esta declaracao, import.meta.env.VITE_API_URL e tipada de forma frouxa e
// um erro de digitacao no nome da variavel passa batido pelo compilador.
interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
