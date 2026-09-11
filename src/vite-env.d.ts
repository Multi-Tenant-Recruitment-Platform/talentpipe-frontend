/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base. Defaults to '/api/v1' (served through the Vite proxy). */
  readonly VITE_API_BASE_URL?: string;
  /** Apex domain workspaces live under, e.g. 'talentpipe.io'. Defaults to that. */
  readonly VITE_APP_ROOT_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
