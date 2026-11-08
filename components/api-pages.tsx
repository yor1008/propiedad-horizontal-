'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import {
  api, errorMessage, peek, TIPOS_CATALOGO,
  type Catalogo, type Cuenta, type NuevaPersona, type Persona, type Rol, type TipoCatalogo, type TipoPersona,
} from '@/lib/api'

type Notify = (message: string) => void

const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador', VIGILANTE: 'Vigilante', PERSONA_VINCULADA: 'Persona vinculada',
}

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

export function Header({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return <section className="hero-row"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{children}</section>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
    <div className="modal-head"><div><h3>{title}</h3></div><button onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    {children}
  </div></div>
}

export function ErrorLine({ message }: { message: string }) {
  return message ? <p role="alert" style={{ color: '#b42318', fontSize: 13, margin: '8px 0' }}>{message}</p> : null
}

// Carga una lista y expone recarga/estado.
export function useList<T>(load: () => Promise<T[]>, deps: unknown[]) {
  const [items, setItems] = useState<T[] | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(() => {
    setError('')
    load().then(setItems).catch(e => { setItems([]); setError(errorMessage(e)) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  useEffect(() => { setItems(null); reload() }, [reload])
  return { items, setItems, error, reload }
}

export const Loading = () => <div className="empty-panel"><p>Cargando…</p></div>

// Datos de referencia: arranca con lo que haya en caché (instantáneo) y revalida en segundo plano.
function useReference<T>(key: string, load: () => Promise<T[]>) {
  const [items, setItems] = useState<T[]>(peek<T[]>(key) ?? [])
  const [loading, setLoading] = useState(peek<T[]>(key) === undefined)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    load().then(v => { if (alive) { setItems(v); setError('') } })
      .catch(e => { if (alive) setError(errorMessage(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { items, loading, error }
}

export function useCatalog(tipo: TipoCatalogo) {
  return useReference<Catalogo>(`cat:${tipo}`, () => api.catalogos.activos(tipo)).items
}
export function useTiposPersona() {
  return useReference<TipoPersona>('tipos-persona', api.tiposPersona)
}

/* ───────────── Formulario de persona (compartido) ───────────── */

export type PersonaForm = {
  tipoPersonaId: string; tipoDocumentoId: string; tipoDocumento: string; numeroDocumento: string; nombres: string
  apellidos: string; telefono: string; correo: string; autoriza: boolean
}
export const emptyPersona: PersonaForm = {
  tipoPersonaId: '', tipoDocumentoId: '', tipoDocumento: '', numeroDocumento: '', nombres: '', apellidos: '', telefono: '', correo: '', autoriza: false,
}
export const personaEdit = (f: PersonaForm) => ({
  nombres: f.nombres, apellidos: f.apellidos, telefono: f.telefono || undefined, correo: f.correo || undefined,
})
export const formFromPersona = (p: Persona): PersonaForm => ({
  ...emptyPersona, nombres: p.nombres, apellidos: p.apellidos, telefono: p.telefono ?? '', correo: p.correo ?? '',
  numeroDocumento: p.numeroDocumento, tipoDocumento: p.tipoDocumento, tipoPersonaId: String(p.tipoPersonaId), autoriza: true,
})
export const personaPayload = (f: PersonaForm): NuevaPersona => ({
  tipoPersonaId: +f.tipoPersonaId, tipoDocumentoId: +f.tipoDocumentoId, numeroDocumento: f.numeroDocumento,
  nombres: f.nombres, apellidos: f.apellidos, telefono: f.telefono || undefined, correo: f.correo || undefined,
  autorizaTratamientoDatos: f.autoriza,
})

export function PersonaFields({ f, setF, lockCore = false }: { f: PersonaForm; setF: (f: PersonaForm) => void; lockCore?: boolean }) {
  const docs = useReference<Catalogo>('cat:TIPO_DOCUMENTO', () => api.catalogos.activos('TIPO_DOCUMENTO'))
  const tipos = useTiposPersona()
  const set = (k: keyof PersonaForm) => (v: string) => setF({ ...f, [k]: v })
  const placeholder = (loading: boolean, error: string) => (loading ? 'Cargando…' : error ? 'No se pudo cargar' : 'Selecciona…')
  // Al editar solo conocemos el nombre del documento: se busca su id para mostrarlo en el desplegable.
  const docValue = lockCore ? String(docs.items.find(d => d.nombre === f.tipoDocumento)?.id ?? '') : f.tipoDocumentoId
  return <>
    <label>Nombres<b>*</b><input required value={f.nombres} onChange={e => set('nombres')(e.target.value)} /></label>
    <label>Apellidos<b>*</b><input required value={f.apellidos} onChange={e => set('apellidos')(e.target.value)} /></label>
    <label>Tipo de documento<b>*</b><select required disabled={lockCore} value={docValue} onChange={e => set('tipoDocumentoId')(e.target.value)}>
      <option value="">{placeholder(docs.loading, docs.error)}</option>{docs.items.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
      {docs.error && <small style={{ color: '#b42318' }}>{docs.error}</small>}</label>
    <label>Número de documento<b>*</b><input required disabled={lockCore} value={f.numeroDocumento} onChange={e => set('numeroDocumento')(e.target.value)} /></label>
    <label>Tipo de persona<b>*</b><select required disabled={lockCore} value={f.tipoPersonaId} onChange={e => set('tipoPersonaId')(e.target.value)}>
      <option value="">{placeholder(tipos.loading, tipos.error)}</option>{tipos.items.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
      {tipos.error && <small style={{ color: '#b42318' }}>{tipos.error}</small>}</label>
    <label>Teléfono<input value={f.telefono} onChange={e => set('telefono')(e.target.value)} /></label>
    <label>Correo de contacto<input type="email" value={f.correo} onChange={e => set('correo')(e.target.value)} /></label>
    <label style={{ flexDirection: 'row', gap: 8 }}><input type="checkbox" disabled={lockCore} checked={f.autoriza} onChange={e => setF({ ...f, autoriza: e.target.checked })} style={{ width: 'auto' }} /> Autoriza el tratamiento de datos</label>
  </>
}

/* ───────────── Cuentas (CU-005) ───────────── */

export function CuentasPage({ notify, myAccountId }: { notify: Notify; myAccountId?: number }) {
  const { items, setItems, error } = useList<Cuenta>(api.cuentas.listar, [])
  const [open, setOpen] = useState(false)

  async function toggle(c: Cuenta) {
    try {
      const updated = await (c.activa ? api.cuentas.desactivar(c.id) : api.cuentas.reactivar(c.id))
      setItems(list => list!.map(x => (x.id === updated.id ? updated : x)))
      notify(updated.activa ? 'Cuenta reactivada' : 'Cuenta desactivada')
    } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="ADMINISTRACIÓN · ACCESO" title="Cuentas">
      <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Nueva cuenta</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <div className="panel table-panel"><div className="table-wrap"><table>
      <thead><tr><th>Correo</th><th>Rol</th><th>Persona</th><th>Último acceso</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>{items.map(c => <tr key={c.id}>
        <td>{c.correo}</td><td>{ROL_LABEL[c.rol]}</td><td>{c.personaId ?? '—'}</td>
        <td>{c.fechaUltimoAcceso ? new Date(c.fechaUltimoAcceso).toLocaleString('es-CO') : '—'}</td>
        <td><Badge tone={c.activa ? 'green' : 'amber'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge></td>
        <td><button className="row-action" disabled={c.id === myAccountId} onClick={() => toggle(c)}>{c.activa ? 'Desactivar' : 'Reactivar'}</button></td>
      </tr>)}</tbody>
    </table></div><div className="table-foot"><span>{items.length} cuentas</span></div></div>}
    {open && <NuevaCuentaModal onClose={() => setOpen(false)} onCreated={c => { setItems(l => [...(l ?? []), c]); setOpen(false); notify('Cuenta creada') }} />}
  </>
}

// Asistente en 2 pasos: el paso 1 crea la persona (POST); si el usuario vuelve con "Atrás" y corrige
// datos, se actualiza (PUT). El paso 2 crea la cuenta con ese personaId (no editable).
// Si se cierra sin terminar, la persona recién creada se elimina para no dejar registros huérfanos.
function NuevaCuentaModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Cuenta) => void }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [persona, setPersona] = useState<PersonaForm>(emptyPersona)
  const [created, setCreated] = useState<Persona | null>(null)
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [rol, setRol] = useState<Rol>('PERSONA_VINCULADA')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const done = useRef(false)

  function close() {
    if (created && !done.current) api.personas.eliminar(created.id).catch(() => {})
    onClose()
  }

  async function savePersona(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const p = created
        ? await api.personas.actualizar(created.id, personaEdit(persona))
        : await api.personas.crear(personaPayload(persona))
      setCreated(p)
      if (!correo && persona.correo) setCorreo(persona.correo)
      setStep(2)
    } catch (err) { setError(errorMessage(err)) }
    setBusy(false)
  }

  // Documento y tipo no se pueden editar: se descarta la persona y se vuelve a empezar.
  async function discard() {
    if (!created) return
    setError(''); setBusy(true)
    try { await api.personas.eliminar(created.id); setCreated(null) } catch (err) { setError(errorMessage(err)) }
    setBusy(false)
  }

  async function saveCuenta(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      const c = await api.cuentas.crear({ correo, contrasena, rol, personaId: created!.id })
      done.current = true
      onCreated(c)
    } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }

  if (step === 1) return <Modal title="Nueva cuenta · Paso 1 de 2: datos de la persona" onClose={close}><form onSubmit={savePersona}>
    <div className="fields-grid"><PersonaFields f={persona} setF={setPersona} lockCore={!!created} /></div>
    {created && <p style={{ fontSize: 13, margin: '8px 0' }}>Persona registrada (ID {created.id}). Puedes corregir nombres, apellidos, teléfono y correo.
      El documento y el tipo no se editan:{' '}<button type="button" className="row-action" disabled={busy} onClick={discard}>descartar y empezar de nuevo</button></p>}
    <ErrorLine message={error} />
    <div className="form-actions"><button type="button" className="secondary-btn" onClick={close}>Cancelar</button>
      <button className="primary-btn" disabled={busy}>{created ? 'Guardar cambios y continuar' : 'Continuar'}</button></div>
  </form></Modal>

  return <Modal title="Nueva cuenta · Paso 2 de 2: datos de la cuenta" onClose={close}><form onSubmit={saveCuenta}>
    <p style={{ fontSize: 13, margin: '0 0 12px' }}>Persona: <b>{created!.nombres} {created!.apellidos}</b> · {created!.tipoDocumento} {created!.numeroDocumento}</p>
    <div className="fields-grid">
      <label>ID de persona<input disabled readOnly value={created!.id} /></label>
      <label>Rol<b>*</b><select value={rol} onChange={e => setRol(e.target.value as Rol)}>
        {(Object.keys(ROL_LABEL) as Rol[]).map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}</select></label>
      <label>Correo de acceso<b>*</b><input type="email" required value={correo} onChange={e => setCorreo(e.target.value)} /></label>
      <label>Contraseña (8–72)<b>*</b><input type="password" required minLength={8} maxLength={72} value={contrasena} onChange={e => setContrasena(e.target.value)} /></label>
    </div>
    <ErrorLine message={error} />
    <div className="form-actions">
      <button type="button" className="secondary-btn" disabled={busy} onClick={() => { setError(''); setStep(1) }}>Atrás</button>
      <button className="primary-btn" disabled={busy}><Check size={16} /> Crear cuenta</button></div>
  </form></Modal>
}

/* ───────────── Catálogos (CU-006) ───────────── */

export function CatalogosPage({ notify, isAdmin }: { notify: Notify; isAdmin: boolean }) {
  const [tipo, setTipo] = useState<TipoCatalogo>('TIPO_DOCUMENTO')
  const { items, setItems, error } = useList<Catalogo>(
    () => (isAdmin ? api.catalogos.todos(tipo) : api.catalogos.activos(tipo)), [tipo, isAdmin])
  const [nombre, setNombre] = useState('')
  const [editing, setEditing] = useState<{ id: number; nombre: string } | null>(null)

  const replace = (c: Catalogo) => setItems(l => l!.map(x => (x.id === c.id ? c : x)))

  async function add(e: React.FormEvent) {
    e.preventDefault()
    try {
      const c = await api.catalogos.crear(tipo, nombre.trim())
      setItems(l => [...(l ?? []), c]); setNombre(''); notify('Valor creado')
    } catch (err) { notify(errorMessage(err)) }
  }
  async function rename() {
    if (!editing) return
    try { replace(await api.catalogos.renombrar(editing.id, editing.nombre.trim())); setEditing(null); notify('Valor actualizado') }
    catch (err) { notify(errorMessage(err)) }
  }
  async function toggle(c: Catalogo) {
    try { replace(await (c.activo ? api.catalogos.desactivar(c.id) : api.catalogos.reactivar(c.id))) }
    catch (err) { notify(errorMessage(err)) }
  }

  return <>
    <Header kicker="ADMINISTRACIÓN · PARAMETRIZACIÓN" title="Catálogos">
      <select value={tipo} onChange={e => setTipo(e.target.value as TipoCatalogo)} aria-label="Tipo de catálogo">
        {TIPOS_CATALOGO.map(t => <option key={t} value={t}>{t.replace('TIPO_', '').replace('_', ' ')}</option>)}
      </select>
    </Header>
    {isAdmin && <form onSubmit={add} className="table-toolbar" style={{ marginBottom: 12 }}>
      <div className="search-field"><input required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nuevo valor…" /></div>
      <button className="primary-btn"><Plus size={16} /> Agregar</button>
    </form>}
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <div className="panel table-panel"><div className="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Estado</th>{isAdmin && <th>Acciones</th>}</tr></thead>
      <tbody>{items.map(c => <tr key={c.id}>
        <td>{editing?.id === c.id
          ? <input autoFocus value={editing.nombre} onChange={e => setEditing({ id: c.id, nombre: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') setEditing(null) }} />
          : c.nombre}</td>
        <td><Badge tone={c.activo ? 'green' : 'amber'}>{c.activo ? 'Activo' : 'Inactivo'}</Badge></td>
        {isAdmin && <td>
          {editing?.id === c.id
            ? <><button className="row-action" onClick={rename}>Guardar</button> <button className="row-action" onClick={() => setEditing(null)}>Cancelar</button></>
            : <><button className="row-action" onClick={() => setEditing({ id: c.id, nombre: c.nombre })}>Renombrar</button> <button className="row-action" onClick={() => toggle(c)}>{c.activo ? 'Desactivar' : 'Reactivar'}</button></>}
        </td>}
      </tr>)}</tbody>
    </table></div><div className="table-foot"><span>{items.length} valores</span></div></div>}
  </>
}

/* ───────────── Cambiar contraseña ───────────── */

export function CambiarContrasena({ notify }: { notify: Notify }) {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await api.cambiarContrasena(actual, nueva)
      setActual(''); setNueva(''); notify('Contraseña actualizada')
    } catch (err) { setError(errorMessage(err)) }
    setBusy(false)
  }

  return <form onSubmit={submit} className="profile-card" style={{ marginTop: 16, padding: 20 }}>
    <h3>Cambiar contraseña</h3>
    <div className="fields-grid">
      <label>Contraseña actual<input type="password" required value={actual} onChange={e => setActual(e.target.value)} autoComplete="current-password" /></label>
      <label>Nueva contraseña (8–72)<input type="password" required minLength={8} maxLength={72} value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" /></label>
    </div>
    <ErrorLine message={error} />
    <div className="form-actions"><button className="primary-btn" disabled={busy}><Check size={16} /> Actualizar contraseña</button></div>
  </form>
}
