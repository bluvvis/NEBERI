/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  /** Должен совпадать с INGEST_API_KEY на API, если ключ включён */
  readonly VITE_INGEST_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
