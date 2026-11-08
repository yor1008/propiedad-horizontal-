'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { api, errorMessage, token, type Me } from '@/lib/api'
import {
  Activity, AlertCircle, ArrowRight, Bell, Building2, CalendarDays, Car, Check, ChevronDown,
  ClipboardList, Clock3, DoorOpen, FileText, Home, KeyRound, LogOut, Mail,
  Menu, Package, ParkingSquare, Plus, Search, Shield, UserRound, Users, Wrench, X,
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
const CambiarContrasena = dynamic(() => import('./api-pages').then(m => m.CambiarContrasena))
const ZonasPage = dynamic(() => import('./reservas').then(m => m.ZonasPage))
const ReservarPage = dynamic(() => import('./reservas').then(m => m.ReservarPage))
const ReservasPage = dynamic(() => import('./reservas').then(m => m.ReservasPage))
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
function primaryModule(role: RoleKey): Module {
  if (role === 'admin') return 'Administración'
  if (role === 'guard') return 'Seguridad'
  return 'Operaciones'
}
const moduleIcon = (m: Module) => (m === 'Administración' ? Building2 : m === 'Operaciones' ? ClipboardList : m === 'Seguridad' ? Shield : Activity)

// Primera pantalla disponible: módulo propio del actor, luego los demás, Transversal al final.
function landingFor(role: RoleKey): { module: Module; page: string } {
  const main = primaryModule(role)
  const order = [main, ...MODULE_ORDER.filter(m => m !== main && m !== 'Transversal'), 'Transversal' as Module]
  for (const m of order) {
    const item = nav[m].find(i => !i.roles || i.roles.includes(role))
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
    { label: 'Personas', icon: Users, roles: ['admin'] },
    { label: 'Inmuebles', icon: Building2, roles: ['admin'] }, { label: 'Vinculaciones', icon: UserRound, roles: ['admin'] },
    { label: 'Cuentas', icon: KeyRound, roles: ['admin'] }, { label: 'Catálogos', icon: ClipboardList, roles: ['admin'] },
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
  Transversal: [{ label: 'Mi perfil', icon: UserRound }, { label: 'Notificaciones', icon: Bell }, { label: 'Actividad reciente', icon: Activity }],
}


const tableData: Record<string, { columns: string[]; rows: string[][] }> = {
  'Historial de accesos': { columns: ['Visitante', 'Documento', 'Inmueble', 'Entrada', 'Movimiento'], rows: [['Camilo Vargas', '1.014.223', 'A-302', '06 nov, 08:32', 'Ingreso'], ['Natalia Pérez', '52.889.112', 'B-704', '06 nov, 07:48', 'Salida'], ['David León', '80.225.911', 'C-101', '05 nov, 19:12', 'Ingreso'], ['Paula Ríos', '43.551.902', 'A-901', '05 nov, 18:40', 'Salida']] },
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) { return <span className={`status-badge ${tone}`}>{children}</span> }

export default function Page() {
  const [me, setMe] = useState<Me | null>(null)
  const [booting, setBooting] = useState(false)
  const user: RoleKey | null = me ? roleFromMe(me) : null
  const [module, setModule] = useState<Module | null>(null)
  const [page, setPage] = useState('')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  function flash(message: string) { setToast(message); setTimeout(() => setToast(''), 2800) }
  function land(role: RoleKey) { const l = landingFor(role); setModule(l.module); setPage(l.page); setQuery('') }
  function logout() { token.clear(); setMe(null); setModule(null) }

  // Restaura la sesión si hay token y cierra sesión si la API responde 401.
  useEffect(() => {
    if (token.get()) {
      setBooting(true)
      api.me().then(m => { setMe(m); land(roleFromMe(m)) }).catch(() => token.clear()).finally(() => setBooting(false))
    }
    const onUnauthorized = () => { setMe(null); setModule(null); setToast('Tu sesión expiró, inicia sesión de nuevo') }
    window.addEventListener('ph:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ph:unauthorized', onUnauthorized)
  }, [])

  async function login(correo: string, contrasena: string) {
    const { accessToken } = await api.login(correo, contrasena)
    token.set(accessToken)
    const m = await api.me()
    setMe(m); land(roleFromMe(m))
    flash('Sesión iniciada')
  }

  const mainModule: Module | null = user ? primaryModule(user) : null
  const activeModule: Module | null = module ?? mainModule
  // Secciones del menú: primero el módulo del actor, Transversal siempre al final.
  const sections = useMemo(() => {
    if (!user || !mainModule) return []
    const order = [mainModule, ...MODULE_ORDER.filter(m => m !== mainModule && m !== 'Transversal'), 'Transversal' as Module]
    return order.map(m => ({
      module: m,
      items: nav[m].filter(i => !i.roles || i.roles.includes(user)),
    })).filter(sec => sec.items.length > 0)
  }, [user, mainModule])

  const currentTable = tableData[page]
  const filteredRows = currentTable?.rows.filter(row => row.join(' ').toLowerCase().includes(query.toLowerCase())) ?? []
  const currentRole = me && user ? profileFromMe(me, user) : null

  function selectPage(m: Module, label: string) { setModule(m); setPage(label); setMobileNav(false); setQuery('') }
  function action(message: string) { setToast(message); setShowModal(false); setTimeout(() => setToast(''), 2800) }

  if (booting) return <main className="welcome"><div className="welcome-inner"><p>Cargando…</p></div></main>
  if (!user) return <><Welcome onLogin={login} />{toast && <div className="toast">{toast}</div>}</>

  const renderSection = (sec: (typeof sections)[number]) => { const SIcon = moduleIcon(sec.module); return <div key={sec.module}>
    <div className="module-label"><SIcon size={15} /> {sec.module}</div>
    <nav>{sec.items.map(item => { const Icon = item.icon; return <button key={item.label} className={activeModule === sec.module && page === item.label ? 'active' : ''} onClick={() => selectPage(sec.module, item.label)}><Icon size={17} /><span>{item.label}</span>{item.label === 'Notificaciones' && <b>2</b>}</button> })}</nav>
  </div> }
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Building2 size={18} /></span><div><strong>Torres del Parque</strong><small>Gestión residencial</small></div></div>
      <div className="sidebar-scroll">{sections.filter(sec => sec.module !== 'Transversal').map(renderSection)}</div>
      <div className="sidebar-common">{sections.filter(sec => sec.module === 'Transversal').map(renderSection)}</div>
      <div className="sidebar-bottom"><button onClick={logout}><LogOut size={17} /> Cerrar sesión</button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menú"><Menu /></button><div><p className="eyebrow">{activeModule} / {page}</p><h1>{page}</h1></div><div className="top-actions"><button className="notification"><Bell size={19} /><i>2</i></button><div className="user-chip"><span>{currentRole!.initials}</span><div><strong>{currentRole!.name}</strong><small>{currentRole!.role}</small></div><ChevronDown size={15} /></div></div></header>
      <div className="content">
        {page === 'Personas' ? <PersonasPage notify={flash} /> : page === 'Inmuebles' ? <InmueblesPage notify={flash} /> : page === 'Vinculaciones' ? <VinculacionesPage notify={flash} /> : page === 'Vehículos' ? <VehiculosPage notify={flash} /> : page === 'Consultar por placa' ? <ConsultaPlacaPage /> : page === 'Parqueaderos' ? <ParqueaderosPage notify={flash} /> : page === 'Correspondencia' ? <CorrespondenciaPage notify={flash} isGuard={user === 'guard'} /> : page === 'Radicar PQRS' ? <RadicarPqrsPage notify={flash} onDone={() => setPage('Mis PQRS')} /> : page === 'Mis PQRS' ? <PqrsListPage notify={flash} admin={false} /> : page === 'Atender PQRS' ? <PqrsListPage notify={flash} admin /> : page === 'Zonas comunes' ? <ZonasPage notify={flash} /> : page === 'Reservar zona' ? <ReservarPage notify={flash} onDone={() => setPage('Mis reservas')} /> : page === 'Mis reservas' ? <ReservasPage notify={flash} admin={false} /> : page === 'Gestionar reservas' ? <ReservasPage notify={flash} admin /> : page === 'Mantenimientos' ? <MantenimientosPage notify={flash} /> : page === 'Cuentas' ? <CuentasPage notify={flash} myAccountId={me!.cuentaId} /> : page === 'Catálogos' ? <CatalogosPage notify={flash} isAdmin={user === 'admin'} /> : page === 'Mi perfil' ? <><PerfilPage me={me!} notify={flash} /><CambiarContrasena notify={flash} /></> : page === 'Notificaciones' || page === 'Actividad reciente' ? <ActivityPage page={page} onAction={action} /> : <DataPage title={page} module={activeModule!} currentRole={user} rows={filteredRows} columns={currentTable?.columns} query={query} setQuery={setQuery} onAdd={() => setShowModal(true)} onAction={action} />}
      </div>
    </main>
    {showModal && <Modal title={page === 'Radicar PQRS' ? 'Radicar nueva PQRS' : `Nuevo registro · ${page}`} onClose={() => setShowModal(false)} onSave={() => action('Registro guardado correctamente')} />}
    {toast && <div className="toast"><Check size={17} /> {toast}</div>}
  </div>
}

function Welcome({ onLogin }: { onLogin: (correo: string, contrasena: string) => Promise<void> }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
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
    <form className="form-card" onSubmit={submit} style={{ maxWidth: 420 }}>
      <div className="fields-grid" style={{ gridTemplateColumns: '1fr' }}>
        <label>Correo<b>*</b><input name="correo" type="email" required autoComplete="username" /></label>
        <label>Contraseña<b>*</b><input name="contrasena" type="password" required autoComplete="current-password" /></label>
      </div>
      {error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}
      <div className="form-actions"><button className="primary-btn" disabled={busy}><KeyRound size={16} /> {busy ? 'Ingresando…' : 'Ingresar'}</button></div>
    </form>
  </div></main>
}



function DataPage({ title, module, currentRole, rows, columns, query, setQuery, onAdd, onAction }: { title: string; module: Module; currentRole: RoleKey; rows: string[][]; columns?: string[]; query: string; setQuery: (s: string) => void; onAdd: () => void; onAction: (s: string) => void }) { const hasTable = !!columns; const readOnly = currentRole === 'owner' || currentRole === 'guard' || title === 'Mis reservas' || title === 'Mis PQRS'; return <><section className="hero-row"><div><span className="section-kicker">{module.toUpperCase()} · GESTIÓN</span><h2>{title}</h2><p>Consulta y gestiona la información de este apartado.</p></div>{!readOnly && <button className="primary-btn" onClick={onAdd}><Plus size={16} /> Nuevo registro</button>}</section>{title === 'Radicar PQRS' ? <div className="form-card"><FormFields title="Detalles de la solicitud" fields={['Tipo de solicitud','Asunto','Descripción de la situación','Archivo adjunto']} /><div className="form-actions"><button className="secondary-btn" onClick={() => onAction('Formulario cancelado')}>Cancelar</button><button className="primary-btn" onClick={() => onAction('PQRS radicada · No. PQRS-2026-0048')}>Enviar solicitud</button></div></div> : hasTable ? <div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar en este listado..." /></div><button className="filter-btn" onClick={() => onAction('Filtros disponibles próximamente')}><ChevronDown size={15} /> Filtrar</button></div><div className="table-wrap"><table><thead><tr>{columns!.map(c => <th key={c}>{c}</th>)}<th>Acciones</th></tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{j === row.length - 1 ? <Badge tone={cell.toLowerCase().includes('pend') || cell.toLowerCase().includes('inactiv') ? 'amber' : cell.toLowerCase().includes('entreg') || cell.toLowerCase().includes('confirm') || cell.toLowerCase().includes('activo') ? 'green' : 'neutral'}>{cell}</Badge> : cell}</td>)}<td><button className="row-action" onClick={() => onAction(`Detalle de ${row[0]}`)}>Ver detalle</button></td></tr>)}</tbody></table></div><div className="table-foot"><span>Mostrando {rows.length} de {rows.length} registros</span><div><button disabled>Anterior</button><button className="selected-page">1</button><button disabled>Siguiente</button></div></div></div> : <div className="empty-panel"><span className="empty-icon"><Activity /></span><h3>Gestiona {title.toLowerCase()}</h3><p>Usa el botón “Nuevo registro” para agregar información y mantener el módulo actualizado.</p><button className="primary-btn" onClick={onAdd}><Plus size={16} /> Crear registro</button></div>}</> }

function FormFields({ title, fields }: { title: string; fields: string[] }) { return <><div className="form-title"><h3>{title}</h3><p>Completa los campos requeridos para continuar.</p></div><div className="fields-grid">{fields.map((f, i) => <label key={f}>{f}{i < 2 && <b>*</b>}{f === 'Descripción de la situación' ? <textarea placeholder={`Escribe ${f.toLowerCase()}...`} /> : f === 'Tipo de solicitud' ? <select defaultValue=""><option value="" disabled>Selecciona una opción</option><option>Petición</option><option>Queja</option><option>Reclamo</option><option>Sugerencia</option></select> : <input placeholder={`Ingresa ${f.toLowerCase()}`} />}</label>)}</div></> }
function Modal({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: () => void }) { return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><h3>{title}</h3><p>Los campos marcados con * son obligatorios.</p></div><button onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div><FormFields title="Información general" fields={['Nombre completo','Identificación','Correo electrónico','Teléfono']} /><div className="form-actions"><button className="secondary-btn" onClick={onClose}>Cancelar</button><button className="primary-btn" onClick={onSave}><Check size={16} /> Guardar registro</button></div></div></div> }
function ActivityPage({ page, onAction }: { page: string; onAction: (s: string) => void }) { const items = page === 'Notificaciones' ? [['Hace 12 min','Nueva correspondencia recibida','Tienes un paquete pendiente por recoger en recepción.','blue'],['Hace 2 h','Reserva confirmada','Tu reserva del Salón social fue confirmada.','green'],['Ayer','Respuesta a PQRS','Tu solicitud PQRS-2026-0039 tiene una nueva respuesta.','amber']] : [['Hoy · 10:42','Correspondencia registrada','Se registró un paquete para tu inmueble.','blue'],['Hoy · 09:18','Reserva confirmada','Salón social reservado para el 08 de noviembre.','green'],['Ayer · 16:05','Visitante autorizado','Camilo Vargas ingresó al conjunto.','amber']]; return <><section className="hero-row"><div><span className="section-kicker">TRANSVERSAL · SEGUIMIENTO</span><h2>{page}</h2><p>Consulta las novedades y movimientos relacionados contigo.</p></div>{page === 'Notificaciones' && <button className="secondary-btn" onClick={() => onAction('Notificaciones marcadas como leídas')}><Check size={16} /> Marcar todas como leídas</button>}</section><div className="panel notification-list">{items.map(([time,title,desc,tone]) => <div className="notification-row" key={title}><span className={`activity-dot ${tone}`} /><div><strong>{title}</strong><p>{desc}</p><small>{time}</small></div><button onClick={() => onAction('Notificación consultada')}><ArrowRight size={16} /></button></div>)}</div></> }
