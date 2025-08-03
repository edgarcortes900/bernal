// src/helpers/api.ts
const ruta_server = import.meta.env.VITE_RUTA_BACKEND
export const ruta_backend = ruta_server
export const endpointLogin = `${ruta_server}/api/usuarios/login/`
