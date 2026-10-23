/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" enables the MSW mock API in production builds (demo mode). */
  readonly VITE_ENABLE_MOCKS?: string;
  /** Origin (and optional path prefix) of the API. Default "": requests go to /api on this origin. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
