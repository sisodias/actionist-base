/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AFFINE_MODULE_URL?: string;
  readonly VITE_AFFINE_BACKEND_URL?: string;
  readonly VITE_AFFINE_ISSUER_URL?: string;
  readonly VITE_AFFINE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
