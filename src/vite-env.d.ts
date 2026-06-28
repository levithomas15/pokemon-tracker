/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_POKETCG_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
