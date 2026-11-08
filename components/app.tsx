'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import TableLabels from './table-labels'
import { api, errorMessage, token, type Me } from '@/lib/api'
import {
  Activity, Bell, Building2, CalendarDays, Car, Check, ChevronDown, ClipboardList, Clock3, DoorOpen,
  FileText, Home, KeyRound, Settings, LogOut, Menu, Package, ParkingSquare, Search, Shield, UserRound, Users, Wrench,
} from 'lucide-react'

const roles = {
  admin: { name: 'Carolina Mejía', role: 'Administrador', email: 'admin@torresdelparque.co', initials: 'CM' },
  owner: { name: 'Andrés Gómez', role: 'Propietario', email: 'andres@correo.co', initials: 'AG' },
  resident: { name: 'Laura Torres', role: 'Residente', email: 'laura@correo.co', initials: 'LT' },
  linked: { name: 'Mateo Ruiz', role: 'Persona vinculada', email: 'mateo@correo.co', initials: 'MR' },
  guard: { name: 'Jorge Salazar', role: 'Vigilante', email: 'jorge@torresdelparque.co', initials: 'JS' },
} as const

type RoleKey = keyof typeof roles
type Profile = { name: string; role: string; email: string; initials: string }

// Las vistas conectadas a la API se cargan bajo demanda (menos JS inicial).
const CuentasPage = dynamic(() => import('./api-pages').then(m => m.CuentasPage))
const CatalogosPage = dynamic(() => import('./api-pages').then(m => m.CatalogosPage))
const ConfiguracionPage = dynamic(() => import('./api-pages').then(m => m.ConfiguracionPage))
const OlvideContrasena = dynamic(() => import('./api-pages').then(m => m.OlvideContrasena))
const CambiarContrasena = dynamic(() => import('./api-pages').then(m => m.CambiarContrasena))
const ZonasPage = dynamic(() => import('./reservas').then(m => m.ZonasPage))
const ReservarPage = dynamic(() => import('./reservas').then(m => m.ReservarPage))
const ReservasPage = dynamic(() => import('./reservas').then(m => m.ReservasPage))
const PreRegistrosPage = dynamic(() => import('./seguridad').then(m => m.PreRegistrosPage))
const AutorizarIngresoPage = dynamic(() => import('./seguridad').then(m => m.AutorizarIngresoPage))
const IngresoSinPreregistroPage = dynamic(() => import('./seguridad').then(m => m.IngresoSinPreregistroPage))
const AccesosDentroPage = dynamic(() => import('./seguridad').then(m => m.AccesosDentroPage))
const HistorialPage = dynamic(() => import('./seguridad').then(m => m.HistorialPage))
const NotificacionesPage = dynamic(() => import('./seguridad').then(m => m.NotificacionesPage))
const MiInmueblePage = dynamic(() => import('./seguridad').then(m => m.MiInmueblePage))
const MantenimientosPage = dynamic(() => import('./mantenimientos').then(m => m.MantenimientosPage))
const PerfilPage = dynamic(() => import('./modules').then(m => m.PerfilPage))
const PersonasPage = dynamic(() => import('./modules').then(m => m.PersonasPage))
const InmueblesPage = dynamic(() => import('./modules').then(m => m.InmueblesPage))
const VinculacionesPage = dynamic(() => import('./modules').then(m => m.VinculacionesPage))
const VehiculosPage = dynamic(() => import('./modules').then(m => m.VehiculosPage))
const ConsultaPlacaPage = dynamic(() => import('./modules').then(m => m.ConsultaPlacaPage))
const ParqueaderosPage = dynamic(() => import('./modules').then(m => m.ParqueaderosPage))
const CorrespondenciaPage = dynamic(() => import('./modules').then(m => m.CorrespondenciaPage))
const RadicarPqrsPage = dynamic(() => import('./modules').then(m => m.RadicarPqrsPage))
const PqrsListPage = dynamic(() => import('./modules').then(m => m.PqrsListPage))

// Traduce la identidad del token (/api/auth/me) al rol de interfaz.
function roleFromMe(me: Me): RoleKey {
  if (me.rol === 'ADMINISTRADOR') return 'admin'
  if (me.rol === 'VIGILANTE') return 'guard'
  if (me.autoridades.includes('ROLE_PROPIETARIO')) return 'owner'
  if (me.autoridades.includes('ROLE_RESIDENTE')) return 'resident'
  return 'linked'
}

// Cada actor entra directo a su módulo; Transversal es común y siempre visible.
const MODULE_ORDER: Module[] = ['Administración', 'Operaciones', 'Seguridad', 'Transversal']
function rolesFromMe(me: Me): RoleKey[] {
  if (me.rol === 'ADMINISTRADOR') return ['admin']
  if (me.rol === 'VIGILANTE') return ['guard']
  const r: RoleKey[] = ['linked'] // toda persona vinculada
  if (me.autoridades.includes('ROLE_PROPIETARIO')) r.push('owner')
  if (me.autoridades.includes('ROLE_RESIDENTE')) r.push('resident')
  return r
}
const canSee = (item: NavItem, roles: RoleKey[]) => !item.roles || item.roles.some(r => roles.includes(r))

function primaryModule(roles: RoleKey[]): Module {
  if (roles.includes('admin')) return 'Administración'
  if (roles.includes('guard')) return 'Seguridad'
  if (roles.includes('resident')) return 'Operaciones'
  if (roles.includes('owner')) return 'Administración'
  return 'Operaciones'
}
const moduleIcon = (m: Module) => (m === 'Administración' ? Building2 : m === 'Operaciones' ? ClipboardList : m === 'Seguridad' ? Shield : Activity)

// Primera pantalla disponible: módulo propio del actor, luego los demás, Transversal al final.
function landingFor(roles: RoleKey[]): { module: Module; page: string } {
  const main = primaryModule(roles)
  const order = [main, ...MODULE_ORDER.filter(m => m !== main && m !== 'Transversal'), 'Transversal' as Module]
  for (const m of order) {
    const item = nav[m].find(i => canSee(i, roles))
    if (item) return { module: m, page: item.label }
  }
  return { module: main, page: '' }
}

function profileFromMe(me: Me, key: RoleKey): Profile {
  return { ...roles[key], name: me.correo.split('@')[0], email: me.correo, initials: me.correo.slice(0, 2).toUpperCase() }
}
type Module = 'Administración' | 'Operaciones' | 'Seguridad' | 'Transversal'

type NavItem = { label: string; icon: any; roles?: RoleKey[] }
const nav: Record<Module, NavItem[]> = {
  Administración: [
    { label: 'Personas', icon: Users, roles: ['admin'] }, { label: 'Mi inmueble', icon: Home, roles: ['owner'] },
    { label: 'Inmuebles', icon: Building2, roles: ['admin'] }, { label: 'Vinculaciones', icon: UserRound, roles: ['admin'] },
    { label: 'Cuentas', icon: KeyRound, roles: ['admin'] }, { label: 'Catálogos', icon: ClipboardList, roles: ['admin'] }, { label: 'Configuración', icon: Settings, roles: ['admin'] },
    { label: 'Vehículos', icon: Car, roles: ['admin'] }, { label: 'Consultar por placa', icon: Search, roles: ['guard'] }, { label: 'Parqueaderos', icon: ParkingSquare, roles: ['admin'] },
  ],
  Operaciones: [
    { label: 'Correspondencia', icon: Package, roles: ['guard', 'linked'] }, { label: 'Radicar PQRS', icon: FileText, roles: ['linked'] },
    { label: 'Mis PQRS', icon: ClipboardList, roles: ['linked'] }, { label: 'Reservar zona', icon: CalendarDays, roles: ['resident'] }, { label: 'Mis reservas', icon: Clock3, roles: ['resident'] },
    { label: 'Zonas comunes', icon: Home, roles: ['admin'] }, { label: 'Gestionar reservas', icon: CalendarDays, roles: ['admin'] }, { label: 'Mantenimientos', icon: Wrench, roles: ['admin'] }, { label: 'Atender PQRS', icon: FileText, roles: ['admin'] },
  ],
  Seguridad: [
    { label: 'Preregistros', icon: UserRound, roles: ['resident'] }, { label: 'Autorizar ingreso', icon: KeyRound, roles: ['guard'] },
    { label: 'Ingreso sin preregistro', icon: DoorOpen, roles: ['guard'] }, { label: 'Parqueadero visitante', icon: ParkingSquare, roles: ['guard'] }, { label: 'Registrar salida', icon: LogOut, roles: ['guard'] },
    { label: 'Visitantes dentro', icon: Users, roles: ['guard'] }, { label: 'Historial de accesos', icon: Activity, roles: ['admin', 'guard'] },
  ],
  Transversal: [{ label: 'Mi perfil', icon: UserRound }, { label: 'Notificaciones', icon: Bell, roles: ['linked'] }],
}



export default function Page() {
  const [me, setMe] = useState<Me | null>(null)
  const [booting, setBooting] = useState(false)
  const user: RoleKey | null = me ? roleFromMe(me) : null
  const esPersona = me?.rol === 'PERSONA_VINCULADA'
  const [module, setModule] = useState<Module | null>(null)
  const [page, setPage] = useState('')
  const [toast, setToast] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [unread, setUnread] = useState(0)

  function flash(message: string) { setToast(message); setTimeout(() => setToast(''), 2800) }
  function land(roles: RoleKey[]) { const l = landingFor(roles); setModule(l.module); setPage(l.page) }
  function logout() { token.clear(); setMe(null); setModule(null) }

  // Restaura la sesión si hay token y cierra sesión si la API responde 401.
  useEffect(() => {
    if (token.get()) {
      setBooting(true)
      api.me().then(m => { setMe(m); land(rolesFromMe(m)) }).catch(() => token.clear()).finally(() => setBooting(false))
    }
    const onUnauthorized = (e: Event) => { setMe(null); setModule(null); setToast(String((e as CustomEvent).detail || 'Tu sesión expiró, inicia sesión de nuevo')) }
    window.addEventListener('ph:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ph:unauthorized', onUnauthorized)
  }, [])

  // Cierra la sesión justo cuando vence el token (aunque la pestaña esté quieta).
  useEffect(() => {
    if (!me) return
    const left = token.remainingMs()
    if (left === null) return
    const t = setTimeout(() => { token.clear(); window.dispatchEvent(new CustomEvent('ph:unauthorized', { detail: 'Tu sesión expiró, inicia sesión de nuevo' })) }, Math.max(left, 0))
    return () => clearTimeout(t)
  }, [me])

  // Número de la campana y del menú: solo existe para personas vinculadas; se refresca cada minuto.
  useEffect(() => {
    if (!esPersona) { setUnread(0); return }
    const load = () => api.notificaciones.conteo().then(c => setUnread(c.noLeidas)).catch(() => {})
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [esPersona])

  async function login(correo: string, contrasena: string) {
    const { accessToken, expiresIn } = await api.login(correo, contrasena)
    token.set(accessToken, expiresIn)
    const m = await api.me()
    setMe(m); land(rolesFromMe(m))
    flash('Sesión iniciada')
  }

  const roles = useMemo(() => (me ? rolesFromMe(me) : []), [me])
  const mainModule: Module | null = me ? primaryModule(roles) : null
  const activeModule: Module | null = module ?? mainModule
  // Secciones del menú: primero el módulo del actor, Transversal siempre al final.
  const sections = useMemo(() => {
    if (!me || !mainModule) return []
    const order = [mainModule, ...MODULE_ORDER.filter(m => m !== mainModule && m !== 'Transversal'), 'Transversal' as Module]
    return order.map(m => ({
      module: m,
      items: nav[m].filter(i => canSee(i, roles)),
    })).filter(sec => sec.items.length > 0)
  }, [me, roles, mainModule])

  const currentRole = me && user ? profileFromMe(me, user) : null

  function selectPage(m: Module, label: string) { setModule(m); setPage(label); setMobileNav(false) }

  if (booting) return <main className="welcome"><div className="welcome-inner"><p>Cargando…</p></div></main>
  if (!user) return <><Welcome onLogin={login} />{toast && <div className="toast">{toast}</div>}</>

  const renderSection = (sec: (typeof sections)[number]) => { const SIcon = moduleIcon(sec.module); return <div key={sec.module}>
    <div className="module-label"><SIcon size={15} /> {sec.module}</div>
    <nav>{sec.items.map(item => { const Icon = item.icon; return <button key={item.label} className={activeModule === sec.module && page === item.label ? 'active' : ''} onClick={() => selectPage(sec.module, item.label)}><Icon size={17} /><span>{item.label}</span>{item.label === 'Notificaciones' && unread > 0 && <b>{unread}</b>}</button> })}</nav>
  </div> }
  return <div className="app-shell">
    <TableLabels />
    {mobileNav && <div className="sidebar-backdrop" onClick={() => setMobileNav(false)} aria-hidden="true" />}
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Building2 size={18} /></span><div><strong>Torres del Parque</strong><small>Gestión residencial</small></div></div>
      <div className="sidebar-scroll">{sections.filter(sec => sec.module !== 'Transversal').map(renderSection)}</div>
      <div className="sidebar-common">{sections.filter(sec => sec.module === 'Transversal').map(renderSection)}</div>
      <div className="sidebar-bottom"><button onClick={logout}><LogOut size={17} /> Cerrar sesión</button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menú"><Menu /></button><div><p className="eyebrow">{activeModule} / {page}</p><h1>{page}</h1></div><div className="top-actions">{esPersona && <button className="notification" onClick={() => selectPage('Transversal', 'Notificaciones')} aria-label="Notificaciones"><Bell size={19} />{unread > 0 && <i>{unread}</i>}</button>}<div className="user-chip"><span>{currentRole!.initials}</span><div><strong>{currentRole!.name}</strong><small>{currentRole!.role}</small></div><ChevronDown size={15} /></div></div></header>
      <div className="content">
        {page === 'Personas' ? <PersonasPage notify={flash} /> : page === 'Inmuebles' ? <InmueblesPage notify={flash} /> : page === 'Vinculaciones' ? <VinculacionesPage notify={flash} /> : page === 'Vehículos' ? <VehiculosPage notify={flash} /> : page === 'Consultar por placa' ? <ConsultaPlacaPage /> : page === 'Parqueaderos' ? <ParqueaderosPage notify={flash} /> : page === 'Correspondencia' ? <CorrespondenciaPage notify={flash} isGuard={user === 'guard'} /> : page === 'Radicar PQRS' ? <RadicarPqrsPage notify={flash} onDone={() => setPage('Mis PQRS')} /> : page === 'Mis PQRS' ? <PqrsListPage notify={flash} admin={false} /> : page === 'Atender PQRS' ? <PqrsListPage notify={flash} admin /> : page === 'Zonas comunes' ? <ZonasPage notify={flash} /> : page === 'Reservar zona' ? <ReservarPage notify={flash} onDone={() => setPage('Mis reservas')} /> : page === 'Mis reservas' ? <ReservasPage notify={flash} admin={false} /> : page === 'Gestionar reservas' ? <ReservasPage notify={flash} admin /> : page === 'Preregistros' ? <PreRegistrosPage notify={flash} /> : page === 'Autorizar ingreso' ? <AutorizarIngresoPage notify={flash} /> : page === 'Ingreso sin preregistro' ? <IngresoSinPreregistroPage notify={flash} /> : page === 'Parqueadero visitante' ? <AccesosDentroPage notify={flash} mode="parqueadero" /> : page === 'Registrar salida' ? <AccesosDentroPage notify={flash} mode="salida" /> : page === 'Visitantes dentro' ? <AccesosDentroPage notify={flash} mode="ver" /> : page === 'Historial de accesos' ? <HistorialPage /> : page === 'Notificaciones' ? <NotificacionesPage notify={flash} onUnread={setUnread} /> : page === 'Mi inmueble' ? <MiInmueblePage /> : page === 'Mantenimientos' ? <MantenimientosPage notify={flash} /> : page === 'Cuentas' ? <CuentasPage notify={flash} myAccountId={me!.cuentaId} /> : page === 'Catálogos' ? <CatalogosPage notify={flash} isAdmin={user === 'admin'} /> : page === 'Configuración' ? <ConfiguracionPage notify={flash} /> : page === 'Mi perfil' ? <PerfilPage me={me!} notify={flash}><CambiarContrasena notify={flash} /></PerfilPage> : null}
      </div>
    </main>
    {toast && <div className="toast"><Check size={17} /> {toast}</div>}
  </div>
}

function Welcome({ onLogin }: { onLogin: (correo: string, contrasena: string) => Promise<void> }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [olvide, setOlvide] = useState(false)
  // Se leen los valores del DOM (no del estado): evita enviar vacío o desactualizado si el navegador
  // autocompleta los campos antes de que la página prerenderizada termine de cargar.
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true)
    const data = new FormData(e.currentTarget)
    const correo = String(data.get('correo') ?? '').trim()
    const contrasena = String(data.get('contrasena') ?? '')
    try { await onLogin(correo, contrasena) } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }
  return <main className="welcome"><img className="welcome-art" src="/login-hero.webp" alt="" aria-hidden="true" fetchPriority="high" decoding="async" /><div className="welcome-inner">
    <div className="brand centered"><span className="brand-mark"><Building2 size={20} /></span><div><strong>Torres del Parque</strong><small>Gestión residencial</small></div></div>
    <div className="welcome-copy"><span className="kicker">PLATAFORMA INTEGRAL</span><h1>Todo el conjunto,<br /><em>en un solo lugar.</em></h1><p>Administra, opera y protege tu comunidad residencial con información clara y decisiones oportunas.</p></div>
    {olvide ? <OlvideContrasena onBack={() => setOlvide(false)} /> : <form className="form-card" onSubmit={submit} style={{ maxWidth: 420 }}>
      <div className="fields-grid" style={{ gridTemplateColumns: '1fr' }}>
        <label>Correo<b>*</b><input name="correo" type="email" required autoComplete="username" /></label>
        <label>Contraseña<b>*</b><input name="contrasena" type="password" required autoComplete="current-password" /></label>
      </div>
      {error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}
      <div className="form-actions" style={{ justifyContent: 'center' }}><button className="primary-btn" disabled={busy}><KeyRound size={16} /> {busy ? 'Ingresando…' : 'Ingresar'}</button></div>
      <div style={{ textAlign: 'center', marginTop: 12 }}><button type="button" onClick={() => setOlvide(true)} style={{ background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>¿Olvidaste tu contraseña?</button></div>
    </form>}
  </div></main>
}




