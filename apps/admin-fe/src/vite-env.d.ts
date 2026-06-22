/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base path for the auth service domain (login pages + better-auth API). */
  readonly VITE_AUTH_BASE?: string;
  /** Base path for the elections backend API. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
