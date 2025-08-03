/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_RUTA_BACKEND: string
  // agrega aquí otras VITE_... que necesites
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}