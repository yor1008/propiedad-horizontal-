'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { api, errorMessage, token, type Me } from '@/lib/api'
import {
  Activity, AlertCircle, ArrowRight, Bell, Building2, CalendarDays, Car, Check, ChevronDown,
  ClipboardList, Clock3, DoorOpen, FileText, Home, KeyRound, LayoutDashboard, LogOut, Mail,
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

// Traduce la identidad del token (/api/auth/me) al rol de interfaz.
function roleFromMe(me: Me): RoleKey {
  if (me.rol === 'ADMINISTRADOR') return 'admin'
  if (me.rol === 'VIGILANTE') return 'guard'
  if (me.autoridades.includes('ROLE_PROPIETARIO')) return 'owner'
  if (me.autoridades.includes('ROLE_RESIDENTE')) return 'resident'
  return 'linked'
}

function profileFromMe(me: Me, key: RoleKey): Profile {
  return { ...roles[key], name: me.correo.split('@')[0], email: me.correo, initials: me.correo.slice(0, 2).toUpperCase() }
}
type Module = 'Administración' | 'Operaciones' | 'Seguridad' | 'Transversal'

type NavItem = { label: string; icon: any; roles?: RoleKey[] }
const nav: Record<Module, NavItem[]> = {
  Administración: [
    { label: 'Resumen', icon: LayoutDashboard }, { label: 'Personas', icon: Users, roles: ['admin'] },
    { label: 'Inmuebles', icon: Building2, roles: ['admin', 'owner'] }, { label: 'Vinculaciones', icon: UserRound, roles: ['admin'] },
    { label: 'Cuentas', icon: KeyRound, roles: ['admin'] }, { label: 'Catálogos', icon: ClipboardList, roles: ['admin'] },
    { label: 'Vehículos', icon: Car, roles: ['admin'] }, { label: 'Consultar por placa', icon: Search, roles: ['guard'] }, { label: 'Parqueaderos', icon: ParkingSquare, roles: ['admin'] },
  ],
  Operaciones: [
    { label: 'Resumen', icon: LayoutDashboard }, { label: 'Correspondencia', icon: Package, roles: ['guard', 'linked'] }, { label: 'Radicar PQRS', icon: FileText, roles: ['linked'] },
    { label: 'Mis PQRS', icon: ClipboardList, roles: ['linked'] }, { label: 'Reservar zona', icon: CalendarDays, roles: ['resident'] }, { label: 'Mis reservas', icon: Clock3, roles: ['resident'] },
    { label: 'Zonas comunes', icon: Home, roles: ['admin'] }, { label: 'Gestionar reservas', icon: CalendarDays, roles: ['admin'] }, { label: 'Mantenimientos', icon: Wrench, roles: ['admin'] }, { label: 'Atender PQRS', icon: FileText, roles: ['admin'] },
  ],
  Seguridad: [
    { label: 'Resumen', icon: LayoutDashboard }, { label: 'Preregistros', icon: UserRound, roles: ['resident'] }, { label: 'Autorizar ingreso', icon: KeyRound, roles: ['guard'] },
    { label: 'Ingreso sin preregistro', icon: DoorOpen, roles: ['guard'] }, { label: 'Parqueadero visitante', icon: ParkingSquare, roles: ['guard'] }, { label: 'Registrar salida', icon: LogOut, roles: ['guard'] },
    { label: 'Visitantes dentro', icon: Users, roles: ['guard'] }, { label: 'Historial de accesos', icon: Activity, roles: ['admin', 'guard'] },
  ],
  Transversal: [{ label: 'Resumen personal', icon: LayoutDashboard }, { label: 'Mi perfil', icon: UserRound }, { label: 'Notificaciones', icon: Bell }, { label: 'Actividad reciente', icon: Activity }],
}

const metrics: Record<Module, { label: string; value: string; note: string; icon: any }[]> = {
  Administración: [{ label: 'Personas registradas', value: '248', note: '+12 este mes', icon: Users }, { label: 'Inmuebles', value: '186', note: '98% ocupados', icon: Building2 }, { label: 'Vehículos', value: '132', note: '8 nuevos', icon: Car }, { label: 'Parqueaderos', value: '142', note: '10 disponibles', icon: ParkingSquare }],
  Operaciones: [{ label: 'Correspondencia pendiente', value: '18', note: '5 recibidas hoy', icon: Package }, { label: 'Reservas activas', value: '12', note: '3 para hoy', icon: CalendarDays }, { label: 'PQRS pendientes', value: '7', note: '2 requieren atención', icon: FileText }, { label: 'Mantenimientos', value: '4', note: 'Próximos 30 días', icon: Wrench }],
  Seguridad: [{ label: 'Visitantes dentro', value: '6', note: '2 con parqueadero', icon: Users }, { label: 'Ingresos del día', value: '42', note: '+8 vs. ayer', icon: DoorOpen }, { label: 'Preregistrados', value: '9', note: '4 próximos', icon: KeyRound }, { label: 'Por autorizar', value: '3', note: 'Requieren revisión', icon: AlertCircle }],
  Transversal: [{ label: 'Actividades recientes', value: '14', note: 'Últimos 7 días', icon: Activity }, { label: 'Notificaciones', value: '5', note: '2 sin leer', icon: Bell }, { label: 'Reservas próximas', value: '2', note: 'Salón social', icon: CalendarDays }, { label: 'Correspondencia', value: '3', note: 'Por recoger', icon: Mail }],
}

const tableData: Record<string, { columns: string[]; rows: string[][] }> = {
  Personas: { columns: ['Nombre', 'Identificación', 'Tipo', 'Contacto', 'Estado'], rows: [['Valentina Rojas', '52.334.118', 'Residente', 'valentina@correo.co', 'Activo'], ['Andrés Gómez', '80.442.901', 'Propietario', 'andres@correo.co', 'Activo'], ['Mateo Ruiz', '1.023.778', 'Vinculada', 'mateo@correo.co', 'Activo'], ['Sofía Castillo', '43.118.220', 'Residente', 'sofia@correo.co', 'Inactivo']] },
  Inmuebles: { columns: ['Inmueble', 'Torre / piso', 'Tipo', 'Propietario', 'Estado'], rows: [['A-302', 'Torre A · 3', 'Apartamento', 'Andrés Gómez', 'Ocupado'], ['B-704', 'Torre B · 7', 'Apartamento', 'María López', 'Ocupado'], ['C-101', 'Torre C · 1', 'Apartamento', 'Valentina Rojas', 'Disponible'], ['A-901', 'Torre A · 9', 'Penthouse', 'Carlos Pérez', 'Ocupado']] },
  Correspondencia: { columns: ['Remitente', 'Destinatario', 'Recepción', 'Tipo', 'Estado'], rows: [['Mercado Libre', 'Laura Torres · B-704', '06 nov, 10:42', 'Paquete', 'Pendiente'], ['Bancolombia', 'Mateo Ruiz · A-302', '06 nov, 09:18', 'Carta', 'Entregada'], ['DHL Express', 'Valentina Rojas · C-101', '05 nov, 16:05', 'Paquete', 'Pendiente'], ['Amazon', 'Andrés Gómez · A-302', '05 nov, 11:30', 'Paquete', 'Entregada']] },
  'Historial de accesos': { columns: ['Visitante', 'Documento', 'Inmueble', 'Entrada', 'Movimiento'], rows: [['Camilo Vargas', '1.014.223', 'A-302', '06 nov, 08:32', 'Ingreso'], ['Natalia Pérez', '52.889.112', 'B-704', '06 nov, 07:48', 'Salida'], ['David León', '80.225.911', 'C-101', '05 nov, 19:12', 'Ingreso'], ['Paula Ríos', '43.551.902', 'A-901', '05 nov, 18:40', 'Salida']] },
  'Mis reservas': { columns: ['Zona común', 'Fecha', 'Horario', 'Invitados', 'Estado'], rows: [['Salón social', '08 nov, 2026', '15:00 – 19:00', '18', 'Confirmada'], ['Gimnasio', '12 nov, 2026', '07:00 – 08:00', '—', 'Confirmada'], ['Terraza BBQ', '21 oct, 2026', '12:00 – 16:00', '10', 'Finalizada']] },
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) { return <span className={`status-badge ${tone}`}>{children}</span> }
function StatCard({ item }: { item: typeof metrics[Module][number] }) { const Icon = item.icon; return <div className="stat-card"><div className="stat-top"><span>{item.label}</span><span className="icon-box"><Icon size={17} /></span></div><strong>{item.value}</strong><small>{item.note}</small></div> }

export default function Page() {
  const [me, setMe] = useState<Me | null>(null)
  const [booting, setBooting] = useState(false)
  const user: RoleKey | null = me ? roleFromMe(me) : null
  const [module, setModule] = useState<Module | null>(null)
  const [page, setPage] = useState('Resumen')
  const [query, setQuery] = useState('')
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)

  function flash(message: string) { setToast(message); setTimeout(() => setToast(''), 2800) }
  function logout() { token.clear(); setMe(null); setModule(null) }

  // Restaura la sesión si hay token y cierra sesión si la API responde 401.
  useEffect(() => {
    if (token.get()) {
      setBooting(true)
      api.me().then(setMe).catch(() => token.clear()).finally(() => setBooting(false))
    }
    const onUnauthorized = () => { setMe(null); setModule(null); setToast('Tu sesión expiró, inicia sesión de nuevo') }
    window.addEventListener('ph:unauthorized', onUnauthorized)
    return () => window.removeEventListener('ph:unauthorized', onUnauthorized)
  }, [])

  async function login(correo: string, contrasena: string) {
    const { accessToken } = await api.login(correo, contrasena)
    token.set(accessToken)
    setMe(await api.me())
    setModule(null); setPage('Resumen')
    flash('Sesión iniciada')
  }

  const availableModules = useMemo<Module[]>(() => {
    if (!user) return []
    const all: Module[] = ['Administración', 'Operaciones', 'Seguridad', 'Transversal']
    if (user === 'admin') return all
    if (user === 'owner') return ['Administración', 'Operaciones', 'Transversal']
    if (user === 'resident') return ['Operaciones', 'Seguridad', 'Transversal']
    if (user === 'linked') return ['Operaciones', 'Transversal']
    return ['Administración', 'Operaciones', 'Seguridad', 'Transversal']
  }, [user])

  const activeNav = module ? nav[module].filter(i => !i.roles || (user && i.roles.includes(user))) : []
  const currentTable = tableData[page]
  const filteredRows = currentTable?.rows.filter(row => row.join(' ').toLowerCase().includes(query.toLowerCase())) ?? []
  const currentRole = me && user ? profileFromMe(me, user) : null

  function selectModule(next: Module) { if (!availableModules.includes(next)) { setToast('Acceso denegado para este módulo'); setTimeout(() => setToast(''), 2800); return } setModule(next); setPage('Resumen'); setQuery('') }
  function selectPage(label: string) { setPage(label); setMobileNav(false); setQuery('') }
  function action(message: string) { setToast(message); setShowModal(false); setTimeout(() => setToast(''), 2800) }

  if (booting) return <main className="welcome"><div className="welcome-inner"><p>Cargando…</p></div></main>
  if (!user) return <><Welcome onLogin={login} />{toast && <div className="toast">{toast}</div>}</>
  if (!module) return <ModulePicker currentRole={currentRole!} modules={availableModules} onSelect={selectModule} onLogout={logout} />

  const MIcon = module === 'Administración' ? Building2 : module === 'Operaciones' ? ClipboardList : module === 'Seguridad' ? Shield : Activity
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Building2 size={18} /></span><div><strong>Torres del Parque</strong><small>Gestión residencial</small></div></div>
      <div className="module-label"><MIcon size={15} /> {module}</div>
      <nav>{activeNav.map(item => { const Icon = item.icon; return <button key={item.label} className={page === item.label ? 'active' : ''} onClick={() => selectPage(item.label)}><Icon size={17} /><span>{item.label}</span>{item.label === 'Notificaciones' && <b>2</b>}</button> })}</nav>
      <div className="sidebar-bottom"><button onClick={() => setModule(null)}><ArrowRight size={17} className="rotate-180" /> Cambiar módulo</button><button onClick={logout}><LogOut size={17} /> Cerrar sesión</button></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(!mobileNav)} aria-label="Abrir menú"><Menu /></button><div><p className="eyebrow">{module} / {page}</p><h1>{page === 'Resumen' ? `Buenos días, ${currentRole!.name.split(' ')[0]}` : page}</h1></div><div className="top-actions"><button className="notification"><Bell size={19} /><i>2</i></button><div className="user-chip"><span>{currentRole!.initials}</span><div><strong>{currentRole!.name}</strong><small>{currentRole!.role}</small></div><ChevronDown size={15} /></div></div></header>
      <div className="content">
        {page === 'Resumen' ? <Dashboard module={module} currentRole={currentRole!} onAction={action} /> : page === 'Cuentas' ? <CuentasPage notify={flash} myAccountId={me!.cuentaId} /> : page === 'Catálogos' ? <CatalogosPage notify={flash} isAdmin={user === 'admin'} /> : page === 'Mi perfil' ? <><Profile currentRole={currentRole!} onAction={action} /><CambiarContrasena notify={flash} /></> : page === 'Notificaciones' || page === 'Actividad reciente' || page === 'Resumen personal' ? <ActivityPage page={page} onAction={action} /> : <DataPage title={page} module={module} currentRole={user} rows={filteredRows} columns={currentTable?.columns} query={query} setQuery={setQuery} onAdd={() => setShowModal(true)} onAction={action} />}
      </div>
    </main>
    {showModal && <Modal title={page === 'Radicar PQRS' ? 'Radicar nueva PQRS' : `Nuevo registro · ${page}`} onClose={() => setShowModal(false)} onSave={() => action('Registro guardado correctamente')} />}
    {toast && <div className="toast"><Check size={17} /> {toast}</div>}
  </div>
}

function Welcome({ onLogin }: { onLogin: (correo: string, contrasena: string) => Promise<void> }) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try { await onLogin(correo, contrasena) } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }
  return <main className="welcome"><div className="welcome-inner">
    <div className="brand centered"><span className="brand-mark"><Building2 size={20} /></span><div><strong>Torres del Parque</strong><small>Gestión residencial</small></div></div>
    <div className="welcome-copy"><span className="kicker">PLATAFORMA INTEGRAL</span><h1>Todo el conjunto,<br /><em>en un solo lugar.</em></h1><p>Administra, opera y protege tu comunidad residencial con información clara y decisiones oportunas.</p></div>
    <form className="form-card" onSubmit={submit} style={{ maxWidth: 420 }}>
      <div className="fields-grid" style={{ gridTemplateColumns: '1fr' }}>
        <label>Correo<b>*</b><input type="email" required autoComplete="username" value={correo} onChange={e => setCorreo(e.target.value)} /></label>
        <label>Contraseña<b>*</b><input type="password" required autoComplete="current-password" value={contrasena} onChange={e => setContrasena(e.target.value)} /></label>
      </div>
      {error && <p role="alert" style={{ color: '#b42318', fontSize: 13 }}>{error}</p>}
      <div className="form-actions"><button className="primary-btn" disabled={busy}><KeyRound size={16} /> {busy ? 'Ingresando…' : 'Ingresar'}</button></div>
    </form>
  </div></main>
}

function ModulePicker({ currentRole, modules, onSelect, onLogout }: { currentRole: Profile; modules: Module[]; onSelect: (m: Module) => void; onLogout: () => void }) { const desc: Record<Module, string> = { Administración: 'Gestiona personas, inmuebles y recursos.', Operaciones: 'Coordina la vida cotidiana del conjunto.', Seguridad: 'Controla accesos y visitantes.', Transversal: 'Tu actividad y servicios personales.' }; return <main className="picker"><header className="picker-head"><div className="brand"><span className="brand-mark"><Building2 size={18} /></span><div><strong>Torres del Parque</strong><small>Gestión residencial</small></div></div><div className="picker-user"><span>{currentRole.initials}</span><div><strong>{currentRole.name}</strong><small>{currentRole.role}</small></div><button onClick={onLogout} aria-label="Cerrar sesión"><LogOut size={17} /></button></div></header><section className="picker-content"><span className="kicker">ACCESO AUTORIZADO</span><h1>¿A dónde quieres ir?</h1><p>Selecciona un módulo para comenzar. Tu acceso está configurado según tu rol.</p><div className="picker-grid">{modules.map(m => <button key={m} className="picker-card" onClick={() => onSelect(m)}><span className="picker-icon">{m === 'Administración' ? <Building2 /> : m === 'Operaciones' ? <ClipboardList /> : m === 'Seguridad' ? <Shield /> : <Activity />}</span><strong>{m}</strong><small>{desc[m]}</small><span className="enter-link">Ingresar <ArrowRight size={15} /></span></button>)}</div></section></main> }

function Dashboard({ module, currentRole, onAction }: { module: Module; currentRole: Profile; onAction: (m: string) => void }) { return <><section className="hero-row"><div><span className="section-kicker">VISTA GENERAL · {module.toUpperCase()}</span><h2>Resumen del módulo</h2><p>Consulta la información más relevante de tu operación.</p></div><button className="primary-btn" onClick={() => onAction('No hay novedades pendientes')}><Bell size={16} /> Ver novedades</button></section><div className="stats-grid">{metrics[module].map(item => <StatCard key={item.label} item={item} />)}</div><div className="dashboard-grid"><div className="panel"><div className="panel-head"><div><h3>Actividad reciente</h3><p>Últimos movimientos registrados</p></div><button className="text-btn" onClick={() => onAction('Mostrando todas las actividades')}>Ver todo <ArrowRight size={15} /></button></div>{[['06 nov · 10:42','Correspondencia recibida','Paquete para Laura Torres','blue'],['06 nov · 09:18','Reserva confirmada','Salón social · 08 nov','green'],['05 nov · 16:05','Nuevo visitante registrado','Camilo Vargas · A-302','amber'],['05 nov · 14:30','Mantenimiento programado','Ascensor Torre B · 12 nov','gray']].map(([time,title,desc,tone]) => <div className="activity-row" key={title}><span className={`activity-dot ${tone}`} /><div><strong>{title}</strong><small>{desc}</small></div><time>{time}</time></div>)}</div><div className="panel quick-panel"><div className="panel-head"><div><h3>Acciones rápidas</h3><p>Accesos frecuentes para tu rol</p></div></div><div className="quick-actions">{(module === 'Administración' ? ['Registrar persona','Nuevo inmueble','Consultar vehículos'] : module === 'Operaciones' ? ['Radicar PQRS','Reservar zona','Registrar correspondencia'] : module === 'Seguridad' ? ['Autorizar ingreso','Registrar salida','Buscar visitante'] : ['Editar mi perfil','Ver notificaciones','Ver actividad']).map(label => <button key={label} onClick={() => onAction(`${label}: función disponible`)}><Plus size={16} /> {label}<ArrowRight size={15} /></button>)}</div></div></div></> }

function DataPage({ title, module, currentRole, rows, columns, query, setQuery, onAdd, onAction }: { title: string; module: Module; currentRole: RoleKey; rows: string[][]; columns?: string[]; query: string; setQuery: (s: string) => void; onAdd: () => void; onAction: (s: string) => void }) { const hasTable = !!columns; const readOnly = currentRole === 'owner' || currentRole === 'guard' || title === 'Mis reservas' || title === 'Mis PQRS'; return <><section className="hero-row"><div><span className="section-kicker">{module.toUpperCase()} · GESTIÓN</span><h2>{title}</h2><p>Consulta y gestiona la información de este apartado.</p></div>{!readOnly && <button className="primary-btn" onClick={onAdd}><Plus size={16} /> Nuevo registro</button>}</section>{title === 'Radicar PQRS' ? <div className="form-card"><FormFields title="Detalles de la solicitud" fields={['Tipo de solicitud','Asunto','Descripción de la situación','Archivo adjunto']} /><div className="form-actions"><button className="secondary-btn" onClick={() => onAction('Formulario cancelado')}>Cancelar</button><button className="primary-btn" onClick={() => onAction('PQRS radicada · No. PQRS-2026-0048')}>Enviar solicitud</button></div></div> : hasTable ? <div className="panel table-panel"><div className="table-toolbar"><div className="search-field"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar en este listado..." /></div><button className="filter-btn" onClick={() => onAction('Filtros disponibles próximamente')}><ChevronDown size={15} /> Filtrar</button></div><div className="table-wrap"><table><thead><tr>{columns!.map(c => <th key={c}>{c}</th>)}<th>Acciones</th></tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j}>{j === row.length - 1 ? <Badge tone={cell.toLowerCase().includes('pend') || cell.toLowerCase().includes('inactiv') ? 'amber' : cell.toLowerCase().includes('entreg') || cell.toLowerCase().includes('confirm') || cell.toLowerCase().includes('activo') ? 'green' : 'neutral'}>{cell}</Badge> : cell}</td>)}<td><button className="row-action" onClick={() => onAction(`Detalle de ${row[0]}`)}>Ver detalle</button></td></tr>)}</tbody></table></div><div className="table-foot"><span>Mostrando {rows.length} de {rows.length} registros</span><div><button disabled>Anterior</button><button className="selected-page">1</button><button disabled>Siguiente</button></div></div></div> : <div className="empty-panel"><span className="empty-icon"><Activity /></span><h3>Gestiona {title.toLowerCase()}</h3><p>Usa el botón “Nuevo registro” para agregar información y mantener el módulo actualizado.</p><button className="primary-btn" onClick={onAdd}><Plus size={16} /> Crear registro</button></div>}</> }

function FormFields({ title, fields }: { title: string; fields: string[] }) { return <><div className="form-title"><h3>{title}</h3><p>Completa los campos requeridos para continuar.</p></div><div className="fields-grid">{fields.map((f, i) => <label key={f}>{f}{i < 2 && <b>*</b>}{f === 'Descripción de la situación' ? <textarea placeholder={`Escribe ${f.toLowerCase()}...`} /> : f === 'Tipo de solicitud' ? <select defaultValue=""><option value="" disabled>Selecciona una opción</option><option>Petición</option><option>Queja</option><option>Reclamo</option><option>Sugerencia</option></select> : <input placeholder={`Ingresa ${f.toLowerCase()}`} />}</label>)}</div></> }
function Modal({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: () => void }) { return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-head"><div><h3>{title}</h3><p>Los campos marcados con * son obligatorios.</p></div><button onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div><FormFields title="Información general" fields={['Nombre completo','Identificación','Correo electrónico','Teléfono']} /><div className="form-actions"><button className="secondary-btn" onClick={onClose}>Cancelar</button><button className="primary-btn" onClick={onSave}><Check size={16} /> Guardar registro</button></div></div></div> }
function Profile({ currentRole, onAction }: { currentRole: Profile; onAction: (s: string) => void }) { return <><section className="hero-row"><div><span className="section-kicker">TRANSVERSAL · CUENTA</span><h2>Mi perfil</h2><p>Consulta y actualiza tus datos personales.</p></div><button className="primary-btn" onClick={() => onAction('Cambios guardados correctamente')}><Check size={16} /> Guardar cambios</button></section><div className="profile-card"><div className="profile-banner"><span className="large-avatar">{currentRole.initials}</span><div><h3>{currentRole.name}</h3><p>{currentRole.role} · Cuenta activa</p></div><Badge tone="green">Activo</Badge></div><div className="fields-grid profile-fields"><label>Nombre completo<input defaultValue={currentRole.name} /></label><label>Correo electrónico<input defaultValue={currentRole.email} /></label><label>Teléfono<input defaultValue="+57 300 555 0182" /></label><label>Rol asignado<input value={currentRole.role} readOnly /></label></div></div></> }
function ActivityPage({ page, onAction }: { page: string; onAction: (s: string) => void }) { const items = page === 'Notificaciones' ? [['Hace 12 min','Nueva correspondencia recibida','Tienes un paquete pendiente por recoger en recepción.','blue'],['Hace 2 h','Reserva confirmada','Tu reserva del Salón social fue confirmada.','green'],['Ayer','Respuesta a PQRS','Tu solicitud PQRS-2026-0039 tiene una nueva respuesta.','amber']] : [['Hoy · 10:42','Correspondencia registrada','Se registró un paquete para tu inmueble.','blue'],['Hoy · 09:18','Reserva confirmada','Salón social reservado para el 08 de noviembre.','green'],['Ayer · 16:05','Visitante autorizado','Camilo Vargas ingresó al conjunto.','amber']]; return <><section className="hero-row"><div><span className="section-kicker">TRANSVERSAL · SEGUIMIENTO</span><h2>{page}</h2><p>Consulta las novedades y movimientos relacionados contigo.</p></div>{page === 'Notificaciones' && <button className="secondary-btn" onClick={() => onAction('Notificaciones marcadas como leídas')}><Check size={16} /> Marcar todas como leídas</button>}</section><div className="panel notification-list">{items.map(([time,title,desc,tone]) => <div className="notification-row" key={title}><span className={`activity-dot ${tone}`} /><div><strong>{title}</strong><p>{desc}</p><small>{time}</small></div><button onClick={() => onAction('Notificación consultada')}><ArrowRight size={16} /></button></div>)}</div></> }
