'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, KeyRound, Plus, Search, X } from 'lucide-react'
import {
  api, errorMessage, peek, TIPOS_CATALOGO,
  type Catalogo, type ConfigGeneral, type ConfigNotificacion, type EventoNotificacion, type Cuenta, type NuevaPersona, type Persona, type Rol, type TipoCatalogo, type TipoPersona,
} from '@/lib/api'
import { PublicFrame } from './brand'

type Notify = (message: string) => void

const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador', VIGILANTE: 'Vigilante', PERSONA_VINCULADA: 'Persona vinculada',
}

export function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

// Placa de vehículo (amarilla, como las colombianas) y placa de apartamento (celeste): el identificador
// de un registro se ve como el rótulo que tiene en la vida real.
export const Placa = ({ value }: { value: string }) => <span className="placa">{value}</span>
export const Unidad = ({ value }: { value: string }) => <span className="unit">{value}</span>

// Un correo largo solo se parte antes de la arroba, nunca a mitad de una palabra.
export const Correo = ({ value }: { value: string }) => {
  const i = value.indexOf('@')
  return i < 0 ? <>{value}</> : <>{value.slice(0, i)}<wbr />{value.slice(i)}</>
}

export function Header({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  // El título ya se muestra en la barra superior; aquí solo van las acciones de la vista (el estilo las
  // coloca junto al buscador en escritorio y como botón flotante en celular).
  return children ? <section className="hero-row" aria-label={title}>{children}</section> : null
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  // Escape cierra el diálogo, igual que el botón de la esquina.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
    <div className="modal-head"><div><h3>{title}</h3></div><button type="button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button></div>
    {children}
  </div></div>
}

export function ErrorLine({ message }: { message: string }) {
  return message ? <p role="alert" className="msg-error">{message}</p> : null
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

export const Loading = () => <div className="skeleton" role="status" aria-label="Cargando"><i /><i /><i /></div>

/* ───────────── Diálogos y filtros reutilizables ───────────── */

// Formulario en modal con descripción opcional, estado "procesando" y estilo de peligro.
export function FormModal({ title, description, submitLabel, danger, onClose, onSubmit, children }: {
  title: string; description?: React.ReactNode; submitLabel: string; danger?: boolean
  onClose: () => void; onSubmit: () => Promise<void>; children?: React.ReactNode
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <Modal title={title} onClose={onClose}><form onSubmit={async e => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await onSubmit() } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }}>
    {description && <div className="dialog-desc">{description}</div>}
    {children && <div className="fields-grid">{children}</div>}
    <ErrorLine message={error} />
    <div className="form-actions"><button type="button" className="secondary-btn" onClick={onClose} disabled={busy}>Cancelar</button>
      <button className={danger ? 'danger-btn' : 'primary-btn'} disabled={busy}><Check size={16} /> {busy ? 'Procesando…' : submitLabel}</button></div>
  </form></Modal>
}

// Pide un texto (motivo, respuesta…), con motivos frecuentes para elegir con un toque.
export function TextPrompt({ title, label, submitLabel, area, description, reasons, danger, onClose, onSubmit }: {
  title: string; label: string; submitLabel: string; area?: boolean; description?: React.ReactNode; reasons?: string[]; danger?: boolean
  onClose: () => void; onSubmit: (v: string) => Promise<void>
}) {
  const [v, setV] = useState('')
  return <FormModal title={title} description={description} danger={danger} submitLabel={submitLabel} onClose={onClose} onSubmit={() => onSubmit(v.trim())}>
    {reasons && <div className="chips" role="group" aria-label="Motivos frecuentes">
      {reasons.map(r => <button key={r} type="button" className={`chip ${v === r ? 'on' : ''}`} onClick={() => setV(r)}>{r}</button>)}</div>}
    <label style={{ gridColumn: '1 / -1' }}>{label}<b>*</b>
      {area ? <textarea required value={v} onChange={e => setV(e.target.value)} /> : <input required value={v} onChange={e => setV(e.target.value)} />}
    </label>
  </FormModal>
}

// Confirmación de una acción sin campos: muestra a qué elemento afecta y qué implica.
export function ConfirmModal({ title, description, details, confirmLabel, danger = true, onClose, onConfirm }: {
  title: string; description: string; details?: [string, string][]; confirmLabel: string; danger?: boolean
  onClose: () => void; onConfirm: () => Promise<void>
}) {
  return <FormModal title={title} description={description} danger={danger} submitLabel={confirmLabel} onClose={onClose} onSubmit={onConfirm}>
    {details && <dl className="summary">{details.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}</dl>}
  </FormModal>
}

// Botón "Eliminar" con confirmación. El borrado es físico y solo procede si el registro no tiene historia:
// si la API responde 409/422, su mensaje (qué usar en su lugar) se muestra en el modal.
export function EliminarBtn({ nombre, run, onDone, notify, disabled }: {
  nombre: string; run: () => Promise<void>; onDone: () => void; notify: Notify; disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  return <>
    <button className="danger" disabled={disabled} onClick={() => setOpen(true)}>Eliminar</button>
    {open && createPortal(<ConfirmModal title={`Eliminar ${nombre}`} confirmLabel="Eliminar definitivamente" onClose={() => setOpen(false)}
      description="Se borra de forma definitiva y no se puede deshacer. Solo es posible si no tiene historia; si la tiene, usa la otra acción (desactivar, cancelar o anular)."
      onConfirm={async () => { await run(); setOpen(false); onDone(); notify('Eliminado') }} />, document.body)}
  </>
}

const FILTROS = [['todos', 'Todos'], ['activos', 'Activos'], ['inactivos', 'Inactivos']] as const

// Búsqueda de texto + filtro Todos/Activos/Inactivos para las listas administrativas.
export function useFilter<T>(items: T[] | null, text: (t: T) => string, active?: (t: T) => boolean) {
  const [q, setQ] = useState('')
  const [st, setSt] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const needle = q.trim().toLowerCase()
  const shown = useMemo(() => items && items.filter(i =>
    (!needle || text(i).toLowerCase().includes(needle)) && (!active || st === 'todos' || active(i) === (st === 'activos'))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [items, needle, st])
  const bar = items === null ? null : <div className="filter-bar">
    <div className="search-field"><Search size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar…" aria-label="Buscar" /></div>
    {active && <div className="seg" role="group" aria-label="Estado">
      {FILTROS.map(([k, label]) => <button key={k} type="button" className={st === k ? 'on' : ''} onClick={() => setSt(k)}>{label}</button>)}</div>}
  </div>
  const foot = (noun: string) => (items && shown && shown.length !== items.length ? `${shown.length} de ${items.length} ${noun}` : `${items?.length ?? 0} ${noun}`)
  return { shown, bar, foot }
}

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
  apellidos: string; telefono: string; correo: string; codigo: string; autoriza: boolean
}
export const emptyPersona: PersonaForm = {
  tipoPersonaId: '', tipoDocumentoId: '', tipoDocumento: '', numeroDocumento: '', nombres: '', apellidos: '', telefono: '', correo: '', codigo: '', autoriza: false,
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
  codigoVerificacion: f.correo ? f.codigo.trim() || undefined : undefined,
  autorizaTratamientoDatos: f.autoriza,
})

export function PersonaFields({ f, setF, lockCore = false }: { f: PersonaForm; setF: (f: PersonaForm) => void; lockCore?: boolean }) {
  const docs = useReference<Catalogo>('cat:TIPO_DOCUMENTO', () => api.catalogos.activos('TIPO_DOCUMENTO'))
  const tipos = useTiposPersona()
  const set = (k: keyof PersonaForm) => (v: string) => setF({ ...f, [k]: v })
  const [sending, setSending] = useState(false)
  const [codeMsg, setCodeMsg] = useState('')
  const [codeErr, setCodeErr] = useState('')
  async function sendCode() {
    setCodeErr(''); setCodeMsg(''); setSending(true)
    try { await api.personas.verificarCorreo(f.correo.trim()); setCodeMsg('Código enviado. Vale 10 minutos; si pides otro, el anterior deja de servir.') }
    catch (err) { setCodeErr(errorMessage(err)) }
    setSending(false)
  }
  const placeholder = (loading: boolean, error: string) => (loading ? 'Cargando…' : error ? 'No se pudo cargar' : 'Selecciona…')
  // Al editar solo conocemos el nombre del documento: se busca su id para mostrarlo en el desplegable.
  const docValue = lockCore ? String(docs.items.find(d => d.nombre === f.tipoDocumento)?.id ?? '') : f.tipoDocumentoId
  return <>
    <label>Nombres<b>*</b><input required value={f.nombres} onChange={e => set('nombres')(e.target.value)} /></label>
    <label>Apellidos<b>*</b><input required value={f.apellidos} onChange={e => set('apellidos')(e.target.value)} /></label>
    <label>Tipo de documento<b>*</b><select required disabled={lockCore} value={docValue} onChange={e => set('tipoDocumentoId')(e.target.value)}>
      <option value="">{placeholder(docs.loading, docs.error)}</option>{docs.items.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select>
      {docs.error && <small className="msg-error">{docs.error}</small>}</label>
    <label>Número de documento<b>*</b><input required disabled={lockCore} value={f.numeroDocumento} onChange={e => set('numeroDocumento')(e.target.value)} /></label>
    <label>Tipo de persona<b>*</b><select required disabled={lockCore} value={f.tipoPersonaId} onChange={e => set('tipoPersonaId')(e.target.value)}>
      <option value="">{placeholder(tipos.loading, tipos.error)}</option>{tipos.items.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
      {tipos.error && <small className="msg-error">{tipos.error}</small>}</label>
    <label>Teléfono<input value={f.telefono} onChange={e => set('telefono')(e.target.value)} /></label>
    <label>Correo de contacto<input type="email" value={f.correo} onChange={e => set('correo')(e.target.value)} /></label>
    {!lockCore && f.correo.trim() && <div className="code-box">
      <label>Código de verificación del correo<b>*</b>
        <div className="row">
          <input required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="6 dígitos" value={f.codigo} onChange={e => set('codigo')(e.target.value.replace(/\D/g, ''))} />
          <button type="button" className="secondary-btn" disabled={sending} onClick={sendCode}>{sending ? 'Enviando…' : codeMsg ? 'Reenviar código' : 'Enviar código'}</button>
        </div></label>
      <small>Pídele a la persona el código que llegó a {f.correo.trim()}.</small>
      {codeMsg && <p className="msg-ok">{codeMsg}</p>}
      {codeErr && <p role="alert" className="msg-error">{codeErr}</p>}
    </div>}
    <label><input type="checkbox" disabled={lockCore} checked={f.autoriza} onChange={e => setF({ ...f, autoriza: e.target.checked })} /> Autoriza el tratamiento de datos</label>
  </>
}

/* ───────────── Cuentas (CU-005) ───────────── */

export function CuentasPage({ notify, myAccountId }: { notify: Notify; myAccountId?: number }) {
  const { items, setItems, error } = useList<Cuenta>(api.cuentas.listar, [])
  const view = useFilter(items, c => `${c.correo} ${ROL_LABEL[c.rol]}`, c => c.activa)
  const [open, setOpen] = useState(false)
  const [off, setOff] = useState<Cuenta | null>(null)

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
    {view.bar}
    {items === null ? <Loading /> : <div className="panel table-panel"><div className="table-wrap"><table>
      <thead><tr><th>Correo</th><th>Rol</th><th>Persona</th><th>Último acceso</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>{(view.shown ?? []).map(c => <tr key={c.id}>
        <td><Correo value={c.correo} /></td><td>{ROL_LABEL[c.rol]}</td><td>{c.personaId ?? '—'}</td>
        <td>{c.fechaUltimoAcceso ? new Date(c.fechaUltimoAcceso).toLocaleString('es-CO') : '—'}</td>
        <td><Badge tone={c.activa ? 'green' : 'amber'}>{c.activa ? 'Activa' : 'Inactiva'}</Badge></td>
        <td><div className="btn-group"><button className={c.activa ? 'danger' : ''} disabled={c.id === myAccountId} onClick={() => (c.activa ? setOff(c) : toggle(c))}>{c.activa ? 'Desactivar' : 'Reactivar'}</button>
          <EliminarBtn nombre={c.correo} disabled={c.id === myAccountId} notify={notify} run={() => api.cuentas.eliminar(c.id)} onDone={() => setItems(l => (l ?? []).filter(x => x.id !== c.id))} /></div></td>
      </tr>)}</tbody>
    </table></div><div className="table-foot"><span>{view.foot('cuentas')}</span></div></div>}
    {off && <ConfirmModal title={`Desactivar ${off.correo}`} confirmLabel="Desactivar cuenta" onClose={() => setOff(null)}
      description="La cuenta dejará de poder iniciar sesión. Puedes reactivarla cuando quieras."
      details={[['Correo', off.correo], ['Rol', ROL_LABEL[off.rol]]]}
      onConfirm={async () => { await toggle(off); setOff(null) }} />}
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
    try { await api.personas.eliminar(created.id); setCreated(null); setPersona(p => ({ ...p, codigo: '' })) } catch (err) { setError(errorMessage(err)) }
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
    {created && <p className="dialog-desc" style={{ margin: '14px 0 0' }}>Persona registrada (ID {created.id}). Puedes corregir nombres, apellidos, teléfono y correo.
      El documento y el tipo no se editan:{' '}<button type="button" className="row-action" disabled={busy} onClick={discard}>descartar y empezar de nuevo</button></p>}
    <ErrorLine message={error} />
    <div className="form-actions"><button type="button" className="secondary-btn" onClick={close}>Cancelar</button>
      <button className="primary-btn" disabled={busy}>{created ? 'Guardar cambios y continuar' : 'Continuar'}</button></div>
  </form></Modal>

  return <Modal title="Nueva cuenta · Paso 2 de 2: datos de la cuenta" onClose={close}><form onSubmit={saveCuenta}>
    <p className="dialog-desc">Persona: <b>{created!.nombres} {created!.apellidos}</b> · {created!.tipoDocumento} {created!.numeroDocumento}</p>
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
            ? <div className="btn-group"><button onClick={rename}>Guardar</button><button onClick={() => setEditing(null)}>Cancelar</button></div>
            : <div className="btn-group"><button onClick={() => setEditing({ id: c.id, nombre: c.nombre })}>Renombrar</button><button className={c.activo ? 'danger' : ''} onClick={() => toggle(c)}>{c.activo ? 'Desactivar' : 'Reactivar'}</button>
              <EliminarBtn nombre={c.nombre} notify={notify} run={() => api.catalogos.eliminar(c.id)} onDone={() => setItems(l => (l ?? []).filter(x => x.id !== c.id))} /></div>}
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

  return <form onSubmit={submit} className="pf-module">
    <div className="pf-module-head"><KeyRound size={16} /><h4>Seguridad · Cambiar contraseña</h4></div>
    <div className="fields-grid">
      <label>Contraseña actual<input type="password" required value={actual} onChange={e => setActual(e.target.value)} autoComplete="current-password" /></label>
      <label>Nueva contraseña (8–72)<input type="password" required minLength={8} maxLength={72} value={nueva} onChange={e => setNueva(e.target.value)} autoComplete="new-password" /></label>
    </div>
    <ErrorLine message={error} />
    <div className="form-actions"><button className="primary-btn" disabled={busy}><Check size={16} /> Actualizar contraseña</button></div>
  </form>
}

/* ───────────── Configuración (CU-007, administrador) ───────────── */
const EVENTO_LABEL: Record<EventoNotificacion, string> = {
  CORRESPONDENCIA_RECIBIDA: 'Correspondencia recibida',
  INGRESO_VISITANTE: 'Ingreso de visitante',
  CAMBIO_ESTADO_RESERVA: 'Cambio de estado de una reserva',
  RESPUESTA_PQRS: 'Respuesta a una PQRS',
}

export function ConfiguracionPage({ notify }: { notify: Notify }) {
  const [general, setGeneral] = useState<ConfigGeneral | null>(null)
  const [eventos, setEventos] = useState<ConfigNotificacion[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.configuracion.general().then(setGeneral).catch(e => setError(errorMessage(e)))
    api.configuracion.notificaciones().then(setEventos).catch(e => setError(errorMessage(e)))
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!general) return
    setBusy(true)
    try { setGeneral(await api.configuracion.guardarGeneral(general)); notify('Parámetros guardados') }
    catch (err) { notify(errorMessage(err)) }
    setBusy(false)
  }
  async function cambiar(c: ConfigNotificacion, cambio: Partial<ConfigNotificacion>) {
    const next = { activa: c.activa, enviarCorreo: c.enviarCorreo, ...cambio }
    try {
      const r = await api.configuracion.guardarNotificacion(c.evento, next)
      setEventos(l => (l ?? []).map(x => (x.evento === r.evento ? r : x)))
    } catch (err) { notify(errorMessage(err)) }
  }

  return <>
    <Header kicker="ADMINISTRACIÓN · PARAMETRIZACIÓN" title="Configuración" />
    <ErrorLine message={error} />
    <form onSubmit={guardar} className="profile-card">
      <h3>Parámetros generales</h3>
      {!general ? <p>Cargando…</p> : <>
        <div className="fields-grid">
          <label>Máximo de vehículos activos por inmueble (0 = sin límite)
            <input type="number" min={0} required value={general.maxVehiculosPorInmueble}
              onChange={e => setGeneral({ ...general, maxVehiculosPorInmueble: Number(e.target.value) })} /></label>
          <label>Plazo para responder una PQRS (días hábiles)
            <input type="number" min={1} required value={general.plazoRespuestaPqrsDias}
              onChange={e => setGeneral({ ...general, plazoRespuestaPqrsDias: Number(e.target.value) })} /></label>
        </div>
        <div className="form-actions"><button className="primary-btn" disabled={busy}><Check size={16} /> Guardar</button></div>
      </>}
    </form>
    <section className="profile-card">
      <h3>Notificaciones por evento</h3>
      <p className="dialog-desc">Desactivar un evento evita que se generen nuevas notificaciones (no afecta las ya creadas). El envío por correo se guarda, pero aún no está implementado en el servidor.</p>
      {!eventos ? <p>Cargando…</p> : <div className="table-wrap"><table><thead><tr><th>Evento</th><th>Activa</th><th>Enviar correo</th></tr></thead><tbody>
        {eventos.map(c => <tr key={c.evento}>
          <td>{EVENTO_LABEL[c.evento] ?? c.evento}</td>
          <td><input type="checkbox" checked={c.activa} onChange={e => cambiar(c, { activa: e.target.checked })} aria-label={`Activar ${EVENTO_LABEL[c.evento]}`} /></td>
          <td><input type="checkbox" checked={c.enviarCorreo} onChange={e => cambiar(c, { enviarCorreo: e.target.checked })} aria-label={`Enviar correo ${EVENTO_LABEL[c.evento]}`} /></td>
        </tr>)}
      </tbody></table></div>}
    </section>
  </>
}

/* ───────────── Olvidé / restablecer contraseña (públicos) ───────────── */
export function OlvideContrasena({ onBack }: { onBack: () => void }) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true)
    const correo = String(new FormData(e.currentTarget).get('correo') ?? '').trim()
    try { await api.olvideContrasena(correo); setSent(true) } catch (err) { setError(errorMessage(err)) }
    setBusy(false)
  }
  return <form className="form-card" onSubmit={submit}>
    <h3>Recuperar contraseña</h3>
    {sent ? <p className="dialog-desc">Si el correo está registrado, te enviamos un enlace.</p> : <>
      <div className="fields-grid one">
        <label>Correo<b>*</b><input name="correo" type="email" required autoComplete="off" /></label>
      </div>
      <ErrorLine message={error} />
      <div className="form-actions"><button className="primary-btn" disabled={busy}>{busy ? 'Enviando…' : 'Enviar enlace'}</button></div>
    </>}
    <div className="form-actions"><button type="button" className="link-btn" onClick={onBack}>Volver al ingreso</button></div>
  </form>
}

export function RestablecerContrasena() {
  const [tokenUrl, setTokenUrl] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { setTokenUrl(new URLSearchParams(window.location.search).get('token') ?? '') }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(''); setBusy(true)
    const nueva = String(new FormData(e.currentTarget).get('nueva') ?? '')
    try { await api.restablecerContrasena(tokenUrl!, nueva); setDone(true) } catch (err) { setError(errorMessage(err)) }
    setBusy(false)
  }
  return <PublicFrame>
    <form className="form-card" onSubmit={submit}>
      <h3>Restablecer contraseña</h3>
      {tokenUrl === null ? <p className="dialog-desc">Cargando…</p>
        : done ? <p className="dialog-desc">Contraseña actualizada. <a href="/">Ir al ingreso</a></p>
        : !tokenUrl ? <p className="dialog-desc">El enlace no es válido. <a href="/">Volver al ingreso</a></p>
        : <>
          <div className="fields-grid one">
            <label>Nueva contraseña (8–72)<b>*</b><input name="nueva" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label>
          </div>
          <ErrorLine message={error} />
          {error && <p className="dialog-desc"><a href="/">Volver al ingreso para pedir otro enlace</a></p>}
          <div className="form-actions"><button className="primary-btn" disabled={busy}><Check size={17} /> {busy ? 'Guardando…' : 'Restablecer'}</button></div>
        </>}
    </form>
  </PublicFrame>
}
