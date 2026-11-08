// Cliente de la API de Propiedad Horizontal (ver ENDPOINTS.md).
// Las llamadas van a /api/* y next.config.mjs las reenvía al backend (evita CORS).

export type Rol = 'ADMINISTRADOR' | 'VIGILANTE' | 'PERSONA_VINCULADA'
export type TipoCatalogo =
  | 'TIPO_DOCUMENTO' | 'TIPO_INMUEBLE' | 'TIPO_VEHICULO'
  | 'TIPO_CORRESPONDENCIA' | 'TIPO_PQRS' | 'TIPO_MANTENIMIENTO'

export const TIPOS_CATALOGO: TipoCatalogo[] = [
  'TIPO_DOCUMENTO', 'TIPO_INMUEBLE', 'TIPO_VEHICULO',
  'TIPO_CORRESPONDENCIA', 'TIPO_PQRS', 'TIPO_MANTENIMIENTO',
]

export type LoginResponse = { accessToken: string; tokenType: string; expiresIn: number }
export type Me = { cuentaId: number; correo: string; rol: Rol; personaId: number | null; autoridades: string[] }
export type Cuenta = { id: number; correo: string; rol: Rol; activa: boolean; personaId: number | null; fechaUltimoAcceso: string | null }
export type NuevaCuenta = { correo: string; contrasena: string; rol: Rol; personaId?: number }
export type Catalogo = { id: number; tipo: TipoCatalogo; nombre: string; activo: boolean }

export class ApiError extends Error {
  constructor(public status: number, message: string, public detalles: string[] = []) {
    super(message)
  }
}

const TOKEN_KEY = 'ph_token'

export const token = {
  get(): string | null {
    try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(value: string) {
    try { sessionStorage.setItem(TOKEN_KEY, value) } catch {}
  },
  clear() {
    try { sessionStorage.removeItem(TOKEN_KEY) } catch {}
  },
}

type Options = { method?: string; body?: unknown; auth?: boolean }

async function request<T>(path: string, { method = 'GET', body, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const t = token.get()
  if (auth && t) headers.Authorization = `Bearer ${t}`

  let res: Response
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor')
  }

  if (res.status === 204) return undefined as T
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // 401 fuera del login = sesión vencida o inválida
    if (res.status === 401 && auth && typeof window !== 'undefined') {
      token.clear()
      window.dispatchEvent(new Event('ph:unauthorized'))
    }
    throw new ApiError(res.status, data?.mensaje ?? 'Error inesperado', data?.detalles ?? [])
  }
  return data as T
}

export const api = {
  login: (correo: string, contrasena: string) =>
    request<LoginResponse>('/api/auth/login', { method: 'POST', body: { correo, contrasena }, auth: false }),
  me: () => request<Me>('/api/auth/me'),
  cambiarContrasena: (actual: string, nueva: string) =>
    request<void>('/api/auth/cambiar-contrasena', { method: 'POST', body: { actual, nueva } }),

  cuentas: {
    listar: () => request<Cuenta[]>('/api/cuentas'),
    obtener: (id: number) => request<Cuenta>(`/api/cuentas/${id}`),
    crear: (c: NuevaCuenta) => request<Cuenta>('/api/cuentas', { method: 'POST', body: c }),
    desactivar: (id: number) => request<Cuenta>(`/api/cuentas/${id}/desactivar`, { method: 'PATCH' }),
    reactivar: (id: number) => request<Cuenta>(`/api/cuentas/${id}/reactivar`, { method: 'PATCH' }),
  },

  catalogos: {
    activos: (tipo: TipoCatalogo) => request<Catalogo[]>(`/api/catalogos/${tipo}`),
    todos: (tipo: TipoCatalogo) => request<Catalogo[]>(`/api/catalogos/${tipo}/todos`),
    crear: (tipo: TipoCatalogo, nombre: string) =>
      request<Catalogo>('/api/catalogos', { method: 'POST', body: { tipo, nombre } }),
    renombrar: (id: number, nombre: string) =>
      request<Catalogo>(`/api/catalogos/${id}`, { method: 'PUT', body: { nombre } }),
    desactivar: (id: number) => request<Catalogo>(`/api/catalogos/${id}/desactivar`, { method: 'PATCH' }),
    reactivar: (id: number) => request<Catalogo>(`/api/catalogos/${id}/reactivar`, { method: 'PATCH' }),
  },
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.detalles.length ? `${e.message}: ${e.detalles.join('; ')}` : e.message
  return 'Error inesperado'
}
