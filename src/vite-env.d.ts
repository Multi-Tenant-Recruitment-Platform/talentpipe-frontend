/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base. Defaults to '/api/v1' (served through the Vite proxy). */
  readonly VITE_API_BASE_URL?: string;
  /** 'mock' serves the public job board from src/data/mockPublicJobs.ts. Anything else uses the API. */
  readonly VITE_PUBLIC_JOBS_SOURCE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
