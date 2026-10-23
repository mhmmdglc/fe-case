/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" enables the MSW mock API in production builds (demo mode). */
  readonly VITE_ENABLE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
