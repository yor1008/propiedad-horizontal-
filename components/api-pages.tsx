'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import {
  api, errorMessage, TIPOS_CATALOGO,
  type Catalogo, type Cuenta, type Rol, type TipoCatalogo,
} from '@/lib/api'

type Notify = (message: string) => void

const ROL_LABEL: Record<Rol, string> = {
  ADMINISTRADOR: 'Administrador', VIGILANTE: 'Vigilante', PERSONA_VINCULADA: 'Persona vinculada',
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

function Header({ kicker, title, children }: { kicker: string; title: string; children?: React.ReactNode }) {
  return <section className="hero-row"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{children}</section>
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onClick={onClose}><div className="modal" onClick={e => e.stopPropagation()}>
    <div className="modal-head"><div><h3>{title}</h3></div><button onClick={onClose} aria-label="Cerrar"><X size={18} /></button></div>
    {children}
  </div></div>
}

function ErrorLine({ message }: { message: string }) {
  return message ? <p role="alert" style={{ color: '#b42318', fontSize: 13, margin: '8px 0' }}>{message}</p> : null
}

// Carga una lista y expone recarga/estado.
function useList<T>(load: () => Promise<T[]>, deps: unknown[]) {
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

const Loading = () => <div className="empty-panel"><p>Cargando…</p></div>

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

function NuevaCuentaModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Cuenta) => void }) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [rol, setRol] = useState<Rol>('VIGILANTE')
  const [personaId, setPersonaId] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (rol === 'PERSONA_VINCULADA' && !personaId) return setError('El ID de persona es obligatorio para una persona vinculada')
    setBusy(true)
    try {
      onCreated(await api.cuentas.crear({ correo, contrasena, rol, ...(personaId ? { personaId: Number(personaId) } : {}) }))
    } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }

  return <Modal title="Nueva cuenta" onClose={onClose}><form onSubmit={submit}>
    <div className="fields-grid">
      <label>Correo<b>*</b><input type="email" required value={correo} onChange={e => setCorreo(e.target.value)} /></label>
      <label>Contraseña (8–72)<b>*</b><input type="password" required minLength={8} maxLength={72} value={contrasena} onChange={e => setContrasena(e.target.value)} /></label>
      <label>Rol<b>*</b><select value={rol} onChange={e => setRol(e.target.value as Rol)}>
        {(Object.keys(ROL_LABEL) as Rol[]).map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
      </select></label>
      <label>ID de persona{rol === 'PERSONA_VINCULADA' && <b>*</b>}<input type="number" min={1} value={personaId} onChange={e => setPersonaId(e.target.value)} /></label>
    </div>
    <ErrorLine message={error} />
    <div className="form-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
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
