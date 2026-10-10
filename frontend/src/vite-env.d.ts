/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_USE_MOCK?: string
  readonly VITE_DEMO_USER?: string
  readonly VITE_DEMO_PASSWORD?: string
  readonly VITE_DEMO_FULLNAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
