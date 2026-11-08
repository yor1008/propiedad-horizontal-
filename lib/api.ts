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

export type TipoPersona = { id: number; nombre: string; descripcion: string; esPropietario: boolean; esResidente: boolean }

export type Persona = {
  id: number; nombres: string; apellidos: string; tipoDocumento: string; numeroDocumento: string
  tipoPersonaId: number; tipoPersona: string; telefono: string | null; correo: string | null
  activa: boolean; inmuebleId: number | null; vinculoVigente: boolean
}
export type NuevaPersona = {
  tipoPersonaId: number; tipoDocumentoId: number; numeroDocumento: string; nombres: string; apellidos: string
  telefono?: string; correo?: string; autorizaTratamientoDatos: boolean
}
// Campos editables de una persona (el documento y su tipo no cambian).
export type PersonaEdit = { nombres: string; apellidos: string; telefono?: string; correo?: string }
export type Inmueble = {
  id: number; torreBloque: string; numero: string; piso: number; tipo: string
  propietario: string | null; ocupado: boolean; activo: boolean
}
export type Vehiculo = {
  id: number; placa: string; tipo: string; marca: string; color: string; activo: boolean
  personaId: number; responsable: string; inmuebleId: number; inmueble: string
}
export type Parqueadero = {
  id: number; torreBloque: string; numero: string; piso: number; tipo: string
  inmuebleAsociadoId: number | null; inmuebleAsociado: string | null; activo: boolean; disponible: boolean
}
export type Correspondencia = {
  id: number; remitente: string; destinatario: string | null; personaId: number | null; inmuebleId: number
  inmueble: string; tipo: string; descripcion: string | null; fechaRecepcion: string
  fechaEntrega: string | null; estado: string; nombreRecibe: string | null
}
export type Pqrs = {
  id: number; tipo: string; asunto: string; descripcion: string; adjunto: string | null
  fechaRadicacion: string; estado: string; respuesta: string | null; fechaRespuesta: string | null
  vencida: boolean; personaId: number; solicitante: string; inmueble: string | null
}

export const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] as const
export type DiaSemana = (typeof DIAS_SEMANA)[number]
export type Horario = { diaSemana: DiaSemana; horaInicio: string; horaFin: string }
export type TipoUsoZona = 'EXCLUSIVO' | 'COMPARTIDO'
export type PeriodoLimite = 'DIA' | 'SEMANA' | 'MES'
export type NuevaZona = {
  nombre: string; descripcion: string; capacidadMaxima: number; tipoUso: TipoUsoZona; requiereAprobacion: boolean
  duracionMaximaMinutos: number; anticipacionMinimaHoras: number; anticipacionMaximaDias: number
  limiteCancelacionHoras: number; maxReservasPorInmueble: number; periodoLimite?: PeriodoLimite; horarios: Horario[]
}
export type Zona = NuevaZona & { id: number; activa: boolean }
export type Disponibilidad = { fecha: string; horarios: Horario[]; ocupadas: { horaInicio: string; horaFin: string; estado: string }[] }
export type Reserva = {
  id: number; zonaId: number; zona: string; personaId: number; solicitante: string; inmuebleId: number; inmueble: string
  fecha: string; horaInicio: string; horaFin: string; numeroAsistentes: number; motivo: string | null
  condicionesUso: string | null; motivoRechazoCancelacion: string | null; estado: string; fechaRegistro: string; puedeCancelar: boolean
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public detalles: string[] = []) {
    super(message)
  }
}

/* ───────────── Caché de datos de referencia ───────────── */
// Tipos y catálogos cambian poco: se guardan en memoria 5 min, se comparten las peticiones en curso y
// se invalidan al modificar un catálogo o al cerrar sesión. `peek` devuelve el valor guardado al instante.
const TTL = 5 * 60_000
const store = new Map<string, { at: number; value?: unknown; pending?: Promise<unknown> }>()

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const e = store.get(key)
  if (e?.value !== undefined && Date.now() - e.at < TTL) return Promise.resolve(e.value as T)
  if (e?.pending) return e.pending as Promise<T>
  const pending = load()
    .then(value => { store.set(key, { at: Date.now(), value }); return value })
    .catch(err => { store.delete(key); throw err })
  store.set(key, { at: e?.at ?? 0, value: e?.value, pending })
  return pending
}
export function peek<T>(key: string): T | undefined { return store.get(key)?.value as T | undefined }
export function invalidate(prefix = '') {
  for (const k of [...store.keys()]) if (k.startsWith(prefix)) store.delete(k)
}
function dropCatalogs<T>(r: T): T { invalidate('cat:'); return r }

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
    invalidate()
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
    activos: (tipo: TipoCatalogo) => cached(`cat:${tipo}`, () => request<Catalogo[]>(`/api/catalogos/${tipo}`)),
    todos: (tipo: TipoCatalogo) => request<Catalogo[]>(`/api/catalogos/${tipo}/todos`),
    crear: (tipo: TipoCatalogo, nombre: string) =>
      request<Catalogo>('/api/catalogos', { method: 'POST', body: { tipo, nombre } }).then(dropCatalogs),
    renombrar: (id: number, nombre: string) =>
      request<Catalogo>(`/api/catalogos/${id}`, { method: 'PUT', body: { nombre } }).then(dropCatalogs),
    desactivar: (id: number) => request<Catalogo>(`/api/catalogos/${id}/desactivar`, { method: 'PATCH' }).then(dropCatalogs),
    reactivar: (id: number) => request<Catalogo>(`/api/catalogos/${id}/reactivar`, { method: 'PATCH' }).then(dropCatalogs),
  },

  personas: {
    listar: () => request<Persona[]>('/api/personas'),
    obtener: (id: number) => request<Persona>(`/api/personas/${id}`),
    crear: (p: NuevaPersona) => request<Persona>('/api/personas', { method: 'POST', body: p }),
    actualizar: (id: number, p: PersonaEdit) => request<Persona>(`/api/personas/${id}`, { method: 'PUT', body: p }),
    desactivar: (id: number, motivo: string) =>
      request<Persona>(`/api/personas/${id}/desactivar`, { method: 'PATCH', body: { motivo } }),
    reactivar: (id: number) => request<Persona>(`/api/personas/${id}/reactivar`, { method: 'PATCH' }),
    eliminar: (id: number) => request<void>(`/api/personas/${id}`, { method: 'DELETE' }),
    finalizarVinculo: (id: number, motivo: string) =>
      request<Persona>(`/api/personas/${id}/finalizar-vinculo`, { method: 'PATCH', body: { motivo } }),
  },

  tiposPersona: () => cached('tipos-persona', () => request<TipoPersona[]>('/api/tipos-persona')),

  perfil: {
    obtener: () => request<Persona>('/api/perfil'),
    actualizar: (p: PersonaEdit) => request<Persona>('/api/perfil', { method: 'PUT', body: p }),
  },

  inmuebles: {
    listar: () => request<Inmueble[]>('/api/inmuebles'),
    obtener: (id: number) => request<Inmueble>(`/api/inmuebles/${id}`),
    personas: (id: number) => request<Persona[]>(`/api/inmuebles/${id}/personas`),
    crear: (i: { torreBloque: string; numero: string; piso: number; tipoId: number }) =>
      request<Inmueble>('/api/inmuebles', { method: 'POST', body: i }),
    vincular: (id: number, v: { personaId: number; tipoPersonaId: number; fechaInicio?: string }) =>
      request<Persona>(`/api/inmuebles/${id}/vinculos`, { method: 'POST', body: v }),
  },

  vehiculos: {
    listar: () => request<Vehiculo[]>('/api/vehiculos'),
    obtener: (id: number) => request<Vehiculo>(`/api/vehiculos/${id}`),
    porPlaca: (placa: string) => request<Vehiculo>(`/api/vehiculos/placa/${encodeURIComponent(placa)}`),
    crear: (v: { personaId: number; inmuebleId: number; placa: string; tipoId: number; marca: string; color: string }) =>
      request<Vehiculo>('/api/vehiculos', { method: 'POST', body: v }),
    actualizar: (id: number, v: { tipoId: number; marca: string; color: string }) =>
      request<Vehiculo>(`/api/vehiculos/${id}`, { method: 'PUT', body: v }),
    desactivar: (id: number, motivo: string) =>
      request<Vehiculo>(`/api/vehiculos/${id}/desactivar`, { method: 'PATCH', body: { motivo } }),
  },

  parqueaderos: {
    listar: () => request<Parqueadero[]>('/api/parqueaderos'),
    crear: (p: { torreBloque: string; numero: string; piso: number; tipoId: number }) =>
      request<Parqueadero>('/api/parqueaderos', { method: 'POST', body: p }),
    asignar: (id: number, inmuebleId: number) =>
      request<Parqueadero>(`/api/parqueaderos/${id}/asignar`, { method: 'PATCH', body: { inmuebleId } }),
    liberar: (id: number) => request<Parqueadero>(`/api/parqueaderos/${id}/liberar`, { method: 'PATCH' }),
    desactivar: (id: number, motivo: string) =>
      request<Parqueadero>(`/api/parqueaderos/${id}/desactivar`, { method: 'PATCH', body: { motivo } }),
  },

  correspondencia: {
    listar: (personaId?: number) =>
      request<Correspondencia[]>(`/api/correspondencia${personaId ? `?personaId=${personaId}` : ''}`),
    mias: () => request<Correspondencia[]>('/api/correspondencia/mias'),
    crear: (c: { inmuebleId: number; personaId?: number; tipoId: number; remitente: string; descripcion?: string }) =>
      request<Correspondencia>('/api/correspondencia', { method: 'POST', body: c }),
    entregar: (id: number, e: { nombreRecibe: string; documentoRecibe?: string }) =>
      request<Correspondencia>(`/api/correspondencia/${id}/entregar`, { method: 'PATCH', body: e }),
  },

  pqrs: {
    listar: () => request<Pqrs[]>('/api/pqrs'),
    mias: () => request<Pqrs[]>('/api/pqrs/mias'),
    radicar: (p: { tipoId: number; asunto: string; descripcion: string; adjunto?: string }) =>
      request<Pqrs>('/api/pqrs', { method: 'POST', body: p }),
    atender: (id: number, respuesta: string) =>
      request<Pqrs>(`/api/pqrs/${id}/atender`, { method: 'PATCH', body: { respuesta } }),
  },

  zonas: {
    activas: () => request<Zona[]>('/api/zonas-comunes'),
    todas: () => request<Zona[]>('/api/zonas-comunes/todas'),
    disponibilidad: (id: number, fecha: string) => request<Disponibilidad>(`/api/zonas-comunes/${id}/disponibilidad?fecha=${fecha}`),
    crear: (z: NuevaZona) => request<Zona>('/api/zonas-comunes', { method: 'POST', body: z }),
    actualizar: (id: number, z: NuevaZona) => request<Zona>(`/api/zonas-comunes/${id}`, { method: 'PUT', body: z }),
    desactivar: (id: number, motivo: string) => request<Zona>(`/api/zonas-comunes/${id}/desactivar`, { method: 'PATCH', body: { motivo } }),
    reactivar: (id: number) => request<Zona>(`/api/zonas-comunes/${id}/reactivar`, { method: 'PATCH' }),
  },

  reservas: {
    mias: () => request<Reserva[]>('/api/reservas/mias'),
    listar: () => request<Reserva[]>('/api/reservas'),
    crear: (r: { zonaId: number; fecha: string; horaInicio: string; horaFin: string; numeroAsistentes: number; motivo?: string }) =>
      request<Reserva>('/api/reservas', { method: 'POST', body: r }),
    cancelar: (id: number, motivo: string) => request<Reserva>(`/api/reservas/${id}/cancelar`, { method: 'PATCH', body: { motivo } }),
    aprobar: (id: number, condiciones?: string) => request<Reserva>(`/api/reservas/${id}/aprobar`, { method: 'PATCH', body: condiciones ? { condiciones } : {} }),
    rechazar: (id: number, motivo: string) => request<Reserva>(`/api/reservas/${id}/rechazar`, { method: 'PATCH', body: { motivo } }),
    anular: (id: number, motivo: string) => request<Reserva>(`/api/reservas/${id}/anular`, { method: 'PATCH', body: { motivo } }),
    finalizar: (id: number) => request<Reserva>(`/api/reservas/${id}/finalizar`, { method: 'PATCH' }),
  },
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.detalles.length ? `${e.message}: ${e.detalles.join('; ')}` : e.message
  return e instanceof Error ? e.message : 'Error inesperado'
}
