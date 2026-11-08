'use client'

import { useEffect, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import {
  api, errorMessage,
  type Catalogo, type Correspondencia, type Inmueble, type Parqueadero, type Persona, type Pqrs,
  type Me, type TipoCatalogo, type Vehiculo,
} from '@/lib/api'
import { Badge, emptyPersona, ErrorLine, formFromPersona, Header, Loading, Modal, PersonaFields, personaEdit, personaPayload, useCatalog, useList, useTiposPersona, type PersonaForm } from './api-pages'

type Notify = (message: string) => void

export const fecha = (v: string | null) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/* ───────────── utilidades compartidas ───────────── */

export function Table({ head, children, foot }: { head: string[]; children: React.ReactNode; foot: string }) {
  return <div className="panel table-panel"><div className="table-wrap"><table>
    <thead><tr>{head.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody>
  </table></div><div className="table-foot"><span>{foot}</span></div></div>
}

export function Select({ label, value, onChange, children, required = true }: {
  label: string; value: string | number; onChange: (v: string) => void; children: React.ReactNode; required?: boolean
}) {
  return <label>{label}{required && <b>*</b>}<select required={required} value={value} onChange={e => onChange(e.target.value)}>
    <option value="">Selecciona…</option>{children}
  </select></label>
}

const options = (items: Catalogo[]) => items.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)

// Modal de formulario con envío asíncrono y manejo de error.
export function FormModal({ title, submitLabel, onClose, onSubmit, children }: {
  title: string; submitLabel: string; onClose: () => void; onSubmit: () => Promise<void>; children: React.ReactNode
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <Modal title={title} onClose={onClose}><form onSubmit={async e => {
    e.preventDefault(); setError(''); setBusy(true)
    try { await onSubmit() } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }}>
    <div className="fields-grid">{children}</div>
    <ErrorLine message={error} />
    <div className="form-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
      <button className="primary-btn" disabled={busy}><Check size={16} /> {submitLabel}</button></div>
  </form></Modal>
}

export function TextPrompt({ title, label, submitLabel, area, onClose, onSubmit }: {
  title: string; label: string; submitLabel: string; area?: boolean; onClose: () => void; onSubmit: (v: string) => Promise<void>
}) {
  const [v, setV] = useState('')
  return <FormModal title={title} submitLabel={submitLabel} onClose={onClose} onSubmit={() => onSubmit(v.trim())}>
    <label style={{ gridColumn: '1 / -1' }}>{label}<b>*</b>
      {area ? <textarea required value={v} onChange={e => setV(e.target.value)} /> : <input required value={v} onChange={e => setV(e.target.value)} />}
    </label>
  </FormModal>
}

export const replaceIn = <T extends { id: number }>(u: T) => (l: T[] | null) => (l ?? []).map(x => (x.id === u.id ? u : x))

/* ───────────── Personas ───────────── */

export function PersonasPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Persona>(api.personas.listar, [])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const [ending, setEnding] = useState<Persona | null>(null)
  const [deact, setDeact] = useState<Persona | null>(null)
  const [del, setDel] = useState<Persona | null>(null)

  async function reactivar(p: Persona) {
    try { setItems(replaceIn(await api.personas.reactivar(p.id))); notify('Persona reactivada') } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="ADMINISTRACIÓN · RESIDENTES" title="Personas">
      <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Nueva persona</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Nombre', 'Documento', 'Tipo', 'Contacto', 'Vínculo', 'Estado', 'Acciones']} foot={`${items.length} personas`}>
      {items.map(p => <tr key={p.id}>
        <td>{p.nombres} {p.apellidos}</td><td>{p.tipoDocumento} {p.numeroDocumento}</td><td>{p.tipoPersona}</td>
        <td>{p.correo ?? p.telefono ?? '—'}</td>
        <td>{p.vinculoVigente ? `Inmueble #${p.inmuebleId}` : 'Sin vínculo'}</td>
        <td><Badge tone={p.activa ? 'green' : 'amber'}>{p.activa ? 'Activa' : 'Inactiva'}</Badge></td>
        <td>
          <button className="row-action" onClick={() => setEditing(p)}>Editar</button>{' '}
          {p.activa ? <button className="row-action" onClick={() => setDeact(p)}>Desactivar</button> : <button className="row-action" onClick={() => reactivar(p)}>Reactivar</button>}{' '}
          {p.vinculoVigente && <button className="row-action" onClick={() => setEnding(p)}>Finalizar vínculo</button>}{' '}
          <button className="row-action" onClick={() => setDel(p)}>Eliminar</button>
        </td>
      </tr>)}
    </Table>}
    {open && <NuevaPersona onClose={() => setOpen(false)} onCreated={p => { setItems(l => [...(l ?? []), p]); setOpen(false); notify('Persona creada') }} />}
    {editing && <EditarPersona persona={editing} onClose={() => setEditing(null)} onSaved={p => { setItems(replaceIn(p)); setEditing(null); notify('Persona actualizada') }}
      save={f => api.personas.actualizar(editing.id, personaEdit(f))} />}
    {ending && <TextPrompt title={`Finalizar vínculo de ${ending.nombres}`} label="Motivo" submitLabel="Finalizar" onClose={() => setEnding(null)}
      onSubmit={async motivo => { setItems(replaceIn(await api.personas.finalizarVinculo(ending.id, motivo))); setEnding(null); notify('Vínculo finalizado') }} />}
    {deact && <TextPrompt title={`Desactivar a ${deact.nombres}`} label="Motivo" submitLabel="Desactivar" onClose={() => setDeact(null)}
      onSubmit={async motivo => { setItems(replaceIn(await api.personas.desactivar(deact.id, motivo))); setDeact(null); notify('Persona desactivada') }} />}
    {del && <FormModal title={`Eliminar a ${del.nombres} ${del.apellidos}`} submitLabel="Eliminar" onClose={() => setDel(null)}
      onSubmit={async () => { await api.personas.eliminar(del.id); setItems(l => (l ?? []).filter(x => x.id !== del.id)); setDel(null); notify('Persona eliminada') }}>
      <p style={{ gridColumn: '1 / -1', fontSize: 13 }}>Se borra de forma definitiva. Solo es posible si la persona no tiene historia (vínculos, cuenta, vehículos, PQRS, reservas…); si la tiene, usa <b>Desactivar</b>.</p>
    </FormModal>}
  </>
}

// Edita los datos permitidos por la API; el documento, su tipo y el tipo de persona se muestran bloqueados.
function EditarPersona({ persona, save, onClose, onSaved }: { persona: Persona; save: (f: PersonaForm) => Promise<Persona>; onClose: () => void; onSaved: (p: Persona) => void }) {
  const [f, setF] = useState<PersonaForm>(formFromPersona(persona))
  return <FormModal title={`Editar a ${persona.nombres}`} submitLabel="Guardar cambios" onClose={onClose} onSubmit={async () => onSaved(await save(f))}>
    <PersonaFields f={f} setF={setF} lockCore />
  </FormModal>
}

function NuevaPersona({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Persona) => void }) {
  const [f, setF] = useState<PersonaForm>(emptyPersona)
  return <FormModal title="Nueva persona" submitLabel="Guardar" onClose={onClose} onSubmit={async () => onCreated(await api.personas.crear(personaPayload(f)))}>
    <PersonaFields f={f} setF={setF} />
  </FormModal>
}

/* ───────────── Inmuebles ───────────── */

export function InmueblesPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Inmueble>(api.inmuebles.listar, [])
  const tipos = useCatalog('TIPO_INMUEBLE')
  const [form, setForm] = useState<{ edit?: Inmueble } | null>(null)
  const [f, setF] = useState({ torreBloque: '', numero: '', piso: '', tipoId: '' })
  const [off, setOff] = useState<Inmueble | null>(null)
  const [del, setDel] = useState<Inmueble | null>(null)

  const openNew = () => { setF({ torreBloque: '', numero: '', piso: '', tipoId: '' }); setForm({}) }
  const openEdit = (i: Inmueble) => {
    setF({ torreBloque: i.torreBloque, numero: i.numero, piso: String(i.piso), tipoId: String(tipos.find(t => t.nombre === i.tipo)?.id ?? '') }); setForm({ edit: i })
  }
  async function reactivar(i: Inmueble) {
    try { setItems(replaceIn(await api.inmuebles.reactivar(i.id))); notify('Inmueble reactivado') } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="ADMINISTRACIÓN · PROPIEDAD" title="Inmuebles">
      <button className="primary-btn" onClick={openNew}><Plus size={16} /> Nuevo inmueble</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Inmueble', 'Piso', 'Tipo', 'Propietario', 'Estado', 'Acciones']} foot={`${items.length} inmuebles`}>
      {items.map(i => <tr key={i.id}>
        <td>{i.torreBloque}-{i.numero} <small>(#{i.id})</small></td><td>{i.piso}</td><td>{i.tipo}</td><td>{i.propietario ?? '—'}</td>
        <td><Badge tone={!i.activo ? 'amber' : i.ocupado ? 'green' : 'neutral'}>{!i.activo ? 'Inactivo' : i.ocupado ? 'Ocupado' : 'Disponible'}</Badge></td>
        <td><button className="row-action" onClick={() => openEdit(i)}>Editar</button>{' '}
          {i.activo ? <button className="row-action" onClick={() => setOff(i)}>Desactivar</button> : <button className="row-action" onClick={() => reactivar(i)}>Reactivar</button>}{' '}
          <button className="row-action" onClick={() => setDel(i)}>Eliminar</button></td>
      </tr>)}
    </Table>}
    {form && <FormModal title={form.edit ? `Editar ${form.edit.torreBloque}-${form.edit.numero}` : 'Nuevo inmueble'} submitLabel="Guardar" onClose={() => setForm(null)} onSubmit={async () => {
      const body = { torreBloque: f.torreBloque, numero: f.numero, piso: +f.piso, tipoId: +f.tipoId }
      if (form.edit) setItems(replaceIn(await api.inmuebles.actualizar(form.edit.id, body)))
      else { const i = await api.inmuebles.crear(body); setItems(l => [...(l ?? []), i]) }
      setForm(null); notify('Inmueble guardado')
    }}>
      <label>Torre / bloque<b>*</b><input required value={f.torreBloque} onChange={e => setF({ ...f, torreBloque: e.target.value })} /></label>
      <label>Número<b>*</b><input required value={f.numero} onChange={e => setF({ ...f, numero: e.target.value })} /></label>
      <label>Piso<b>*</b><input type="number" required value={f.piso} onChange={e => setF({ ...f, piso: e.target.value })} /></label>
      <Select label="Tipo" value={f.tipoId} onChange={v => setF({ ...f, tipoId: v })}>{options(tipos)}</Select>
    </FormModal>}
    {off && <TextPrompt title={`Desactivar ${off.torreBloque}-${off.numero}`} label="Motivo" submitLabel="Desactivar" onClose={() => setOff(null)}
      onSubmit={async motivo => { setItems(replaceIn(await api.inmuebles.desactivar(off.id, motivo))); setOff(null); notify('Inmueble desactivado') }} />}
    {del && <FormModal title={`Eliminar ${del.torreBloque}-${del.numero}`} submitLabel="Eliminar" onClose={() => setDel(null)}
      onSubmit={async () => { await api.inmuebles.eliminar(del.id); setItems(l => (l ?? []).filter(x => x.id !== del.id)); setDel(null); notify('Inmueble eliminado') }}>
      <p style={{ gridColumn: '1 / -1', fontSize: 13 }}>Se borra de forma definitiva. Solo es posible si nunca se usó (sin personas, vehículos, correspondencia, PQRS, reservas…); si tiene historia, usa <b>Desactivar</b>.</p>
    </FormModal>}
  </>
}

/* ───────────── Vinculaciones ───────────── */

export function VinculacionesPage({ notify }: { notify: Notify }) {
  const tiposPersona = useTiposPersona()
  const inmuebles = useList<Inmueble>(api.inmuebles.listar, [])
  const personas = useList<Persona>(api.personas.listar, [])
  const [sel, setSel] = useState('')
  const [moradores, setMoradores] = useState<Persona[] | null>(null)
  const [f, setF] = useState({ personaId: '', tipoPersonaId: '', fechaInicio: '' })
  const [ending, setEnding] = useState<Persona | null>(null)
  const [open, setOpen] = useState(false)

  const load = (id: string) => { setMoradores(null); if (id) api.inmuebles.personas(+id).then(setMoradores).catch(e => { setMoradores([]); notify(errorMessage(e)) }) }
  useEffect(() => load(sel), [sel]) // eslint-disable-line react-hooks/exhaustive-deps

  return <>
    <Header kicker="ADMINISTRACIÓN · VÍNCULOS" title="Vinculaciones">
      {sel && <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Vincular persona</button>}
    </Header>
    <ErrorLine message={inmuebles.error || personas.error} />
    <div className="table-toolbar" style={{ marginBottom: 12 }}>
      <select value={sel} onChange={e => setSel(e.target.value)} aria-label="Inmueble">
        <option value="">Selecciona un inmueble…</option>
        {(inmuebles.items ?? []).map(i => <option key={i.id} value={i.id}>{i.torreBloque}-{i.numero}</option>)}
      </select>
    </div>
    {!sel ? <div className="empty-panel"><p>Elige un inmueble para ver y gestionar a sus personas.</p></div>
      : moradores === null ? <Loading />
      : <Table head={['Persona', 'Tipo', 'Documento', 'Acciones']} foot={`${moradores.length} personas vinculadas`}>
        {moradores.map(p => <tr key={p.id}><td>{p.nombres} {p.apellidos}</td><td>{p.tipoPersona}</td><td>{p.numeroDocumento}</td>
          <td><button className="row-action" onClick={() => setEnding(p)}>Finalizar vínculo</button></td></tr>)}
      </Table>}
    {open && <FormModal title="Vincular persona" submitLabel="Vincular" onClose={() => setOpen(false)} onSubmit={async () => {
      await api.inmuebles.vincular(+sel, { personaId: +f.personaId, tipoPersonaId: +f.tipoPersonaId, fechaInicio: f.fechaInicio || undefined })
      setOpen(false); load(sel); notify('Persona vinculada')
    }}>
      <Select label="Persona" value={f.personaId} onChange={v => setF({ ...f, personaId: v })}>
        {(personas.items ?? []).map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
      </Select>
      <Select label="Tipo de vínculo" value={f.tipoPersonaId} onChange={v => setF({ ...f, tipoPersonaId: v })}>
        {tiposPersona.items.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
      </Select>
      <label>Fecha de inicio<input type="date" value={f.fechaInicio} onChange={e => setF({ ...f, fechaInicio: e.target.value })} /></label>
    </FormModal>}
    {ending && <TextPrompt title={`Finalizar vínculo de ${ending.nombres}`} label="Motivo" submitLabel="Finalizar" onClose={() => setEnding(null)}
      onSubmit={async m => { await api.personas.finalizarVinculo(ending.id, m); setEnding(null); load(sel); notify('Vínculo finalizado') }} />}
  </>
}

/* ───────────── Vehículos ───────────── */

export function VehiculosPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Vehiculo>(api.vehiculos.listar, [])
  const personas = useList<Persona>(api.personas.listar, [])
  const inmuebles = useList<Inmueble>(api.inmuebles.listar, [])
  const tipos = useCatalog('TIPO_VEHICULO')
  const [form, setForm] = useState<{ edit?: Vehiculo } | null>(null)
  const [f, setF] = useState({ personaId: '', inmuebleId: '', placa: '', tipoId: '', marca: '', color: '' })
  const [off, setOff] = useState<Vehiculo | null>(null)

  const openNew = () => { setF({ personaId: '', inmuebleId: '', placa: '', tipoId: '', marca: '', color: '' }); setForm({}) }
  const openEdit = (v: Vehiculo) => {
    setF({ personaId: '', inmuebleId: '', placa: v.placa, tipoId: String(tipos.find(t => t.nombre === v.tipo)?.id ?? ''), marca: v.marca, color: v.color }); setForm({ edit: v })
  }

  return <>
    <Header kicker="ADMINISTRACIÓN · MOVILIDAD" title="Vehículos">
      <button className="primary-btn" onClick={openNew}><Plus size={16} /> Nuevo vehículo</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Placa', 'Tipo', 'Marca / color', 'Responsable', 'Inmueble', 'Estado', 'Acciones']} foot={`${items.length} vehículos`}>
      {items.map(v => <tr key={v.id}>
        <td><b>{v.placa}</b></td><td>{v.tipo}</td><td>{v.marca} · {v.color}</td><td>{v.responsable}</td><td>{v.inmueble}</td>
        <td><Badge tone={v.activo ? 'green' : 'amber'}>{v.activo ? 'Activo' : 'Inactivo'}</Badge></td>
        <td>{v.activo && <><button className="row-action" onClick={() => openEdit(v)}>Editar</button> <button className="row-action" onClick={() => setOff(v)}>Desactivar</button></>}</td>
      </tr>)}
    </Table>}
    {form && <FormModal title={form.edit ? `Editar ${form.edit.placa}` : 'Nuevo vehículo'} submitLabel="Guardar" onClose={() => setForm(null)} onSubmit={async () => {
      if (form.edit) {
        setItems(replaceIn(await api.vehiculos.actualizar(form.edit.id, { tipoId: +f.tipoId, marca: f.marca, color: f.color })))
      } else {
        const v = await api.vehiculos.crear({ personaId: +f.personaId, inmuebleId: +f.inmuebleId, placa: f.placa, tipoId: +f.tipoId, marca: f.marca, color: f.color })
        setItems(l => [...(l ?? []), v])
      }
      setForm(null); notify('Vehículo guardado')
    }}>
      {!form.edit && <>
        <label>Placa<b>*</b><input required value={f.placa} onChange={e => setF({ ...f, placa: e.target.value.toUpperCase() })} /></label>
        <Select label="Responsable" value={f.personaId} onChange={v => setF({ ...f, personaId: v })}>
          {(personas.items ?? []).filter(p => p.vinculoVigente).map(p => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
        </Select>
        <Select label="Inmueble" value={f.inmuebleId} onChange={v => setF({ ...f, inmuebleId: v })}>
          {(inmuebles.items ?? []).map(i => <option key={i.id} value={i.id}>{i.torreBloque}-{i.numero}</option>)}
        </Select></>}
      <Select label="Tipo" value={f.tipoId} onChange={v => setF({ ...f, tipoId: v })}>{options(tipos)}</Select>
      <label>Marca<b>*</b><input required value={f.marca} onChange={e => setF({ ...f, marca: e.target.value })} /></label>
      <label>Color<b>*</b><input required value={f.color} onChange={e => setF({ ...f, color: e.target.value })} /></label>
    </FormModal>}
    {off && <TextPrompt title={`Desactivar ${off.placa}`} label="Motivo" submitLabel="Desactivar" onClose={() => setOff(null)}
      onSubmit={async m => { setItems(replaceIn(await api.vehiculos.desactivar(off.id, m))); setOff(null); notify('Vehículo desactivado') }} />}
  </>
}

export function ConsultaPlacaPage() {
  const [placa, setPlaca] = useState('')
  const [v, setV] = useState<Vehiculo | null>(null)
  const [error, setError] = useState('')
  async function buscar(e: React.FormEvent) {
    e.preventDefault(); setError(''); setV(null)
    try { setV(await api.vehiculos.porPlaca(placa.trim())) } catch (err) { setError(errorMessage(err)) }
  }
  return <>
    <Header kicker="ADMINISTRACIÓN · CONSULTA" title="Consultar por placa" />
    <form onSubmit={buscar} className="table-toolbar" style={{ marginBottom: 12 }}>
      <div className="search-field"><Search size={16} /><input required value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} placeholder="Placa, ej. ABC123" /></div>
      <button className="primary-btn">Buscar</button>
    </form>
    <ErrorLine message={error} />
    {v && <div className="panel" style={{ padding: 20 }}>
      <h3>{v.placa} <Badge tone={v.activo ? 'green' : 'amber'}>{v.activo ? 'Activo' : 'Inactivo'}</Badge></h3>
      <p>{v.tipo} · {v.marca} · {v.color}</p><p>Responsable: <b>{v.responsable}</b> · Inmueble: <b>{v.inmueble}</b></p>
    </div>}
  </>
}

/* ───────────── Parqueaderos ───────────── */

export function ParqueaderosPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Parqueadero>(api.parqueaderos.listar, [])
  const inmuebles = useList<Inmueble>(api.inmuebles.listar, [])
  const tipos = useCatalog('TIPO_INMUEBLE')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ torreBloque: '', numero: '', piso: '', tipoId: '' })
  const [assign, setAssign] = useState<Parqueadero | null>(null)
  const [inm, setInm] = useState('')
  const [off, setOff] = useState<Parqueadero | null>(null)

  async function liberar(p: Parqueadero) {
    try { setItems(replaceIn(await api.parqueaderos.liberar(p.id))); notify('Parqueadero liberado') } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="ADMINISTRACIÓN · MOVILIDAD" title="Parqueaderos">
      <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Nuevo parqueadero</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Parqueadero', 'Piso', 'Tipo', 'Asignado a', 'Estado', 'Acciones']} foot={`${items.length} parqueaderos`}>
      {items.map(p => <tr key={p.id}>
        <td>{p.torreBloque}-{p.numero}</td><td>{p.piso}</td><td>{p.tipo}</td><td>{p.inmuebleAsociado ?? '—'}</td>
        <td><Badge tone={!p.activo ? 'amber' : p.disponible ? 'green' : 'neutral'}>{!p.activo ? 'Inactivo' : p.disponible ? 'Disponible' : 'Asignado'}</Badge></td>
        <td>{p.activo && <>{p.disponible
          ? <button className="row-action" onClick={() => { setInm(''); setAssign(p) }}>Asignar</button>
          : <button className="row-action" onClick={() => liberar(p)}>Liberar</button>} <button className="row-action" onClick={() => setOff(p)}>Desactivar</button></>}</td>
      </tr>)}
    </Table>}
    {open && <FormModal title="Nuevo parqueadero" submitLabel="Guardar" onClose={() => setOpen(false)} onSubmit={async () => {
      const p = await api.parqueaderos.crear({ torreBloque: f.torreBloque, numero: f.numero, piso: +f.piso, tipoId: +f.tipoId })
      setItems(l => [...(l ?? []), p]); setOpen(false); notify('Parqueadero creado')
    }}>
      <label>Zona / bloque<b>*</b><input required value={f.torreBloque} onChange={e => setF({ ...f, torreBloque: e.target.value })} /></label>
      <label>Número<b>*</b><input required value={f.numero} onChange={e => setF({ ...f, numero: e.target.value })} /></label>
      <label>Piso<b>*</b><input type="number" required value={f.piso} onChange={e => setF({ ...f, piso: e.target.value })} /></label>
      <Select label="Tipo" value={f.tipoId} onChange={v => setF({ ...f, tipoId: v })}>{options(tipos)}</Select>
    </FormModal>}
    {assign && <FormModal title={`Asignar ${assign.torreBloque}-${assign.numero}`} submitLabel="Asignar" onClose={() => setAssign(null)} onSubmit={async () => {
      setItems(replaceIn(await api.parqueaderos.asignar(assign.id, +inm))); setAssign(null); notify('Parqueadero asignado')
    }}>
      <Select label="Inmueble" value={inm} onChange={setInm}>{(inmuebles.items ?? []).map(i => <option key={i.id} value={i.id}>{i.torreBloque}-{i.numero}</option>)}</Select>
    </FormModal>}
    {off && <TextPrompt title={`Desactivar ${off.torreBloque}-${off.numero}`} label="Motivo" submitLabel="Desactivar" onClose={() => setOff(null)}
      onSubmit={async m => { setItems(replaceIn(await api.parqueaderos.desactivar(off.id, m))); setOff(null); notify('Parqueadero desactivado') }} />}
  </>
}

/* ───────────── Correspondencia ───────────── */

const corrTone = (e: string) => (e.toLowerCase().startsWith('entreg') ? 'green' : 'amber')

// Vigilante: registra, filtra por persona y entrega. Persona vinculada: solo ve las suyas.
export function CorrespondenciaPage({ notify, isGuard }: { notify: Notify; isGuard: boolean }) {
  const [filtro, setFiltro] = useState('')
  const { items, setItems, error } = useList<Correspondencia>(
    () => (isGuard ? api.correspondencia.listar(filtro ? +filtro : undefined) : api.correspondencia.mias()), [isGuard, filtro])
  const tipos = useCatalog('TIPO_CORRESPONDENCIA')
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ inmuebleId: '', personaId: '', tipoId: '', remitente: '', descripcion: '' })
  const [deliver, setDeliver] = useState<Correspondencia | null>(null)
  const [d, setD] = useState({ nombreRecibe: '', documentoRecibe: '' })

  return <>
    <Header kicker="OPERACIONES · RECEPCIÓN" title="Correspondencia">
      {isGuard && <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Registrar</button>}
    </Header>
    {isGuard && <div className="table-toolbar" style={{ marginBottom: 12 }}>
      <div className="search-field"><Search size={16} /><input type="number" value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="Filtrar por ID de persona…" /></div>
    </div>}
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Remitente', 'Destinatario', 'Recepción', 'Tipo', 'Estado', ...(isGuard ? ['Acciones'] : [])]} foot={`${items.length} registros`}>
      {items.map(c => <tr key={c.id}>
        <td>{c.remitente}</td><td>{c.destinatario ?? 'Inmueble'} · {c.inmueble}</td><td>{fecha(c.fechaRecepcion)}</td><td>{c.tipo}</td>
        <td><Badge tone={corrTone(c.estado)}>{c.estado}</Badge></td>
        {isGuard && <td>{!c.fechaEntrega && <button className="row-action" onClick={() => { setD({ nombreRecibe: '', documentoRecibe: '' }); setDeliver(c) }}>Entregar</button>}</td>}
      </tr>)}
    </Table>}
    {open && <FormModal title="Registrar correspondencia" submitLabel="Registrar" onClose={() => setOpen(false)} onSubmit={async () => {
      const c = await api.correspondencia.crear({ inmuebleId: +f.inmuebleId, personaId: f.personaId ? +f.personaId : undefined, tipoId: +f.tipoId, remitente: f.remitente, descripcion: f.descripcion || undefined })
      setItems(l => [c, ...(l ?? [])]); setOpen(false); notify('Correspondencia registrada')
    }}>
      <label>ID del inmueble<b>*</b><input type="number" min={1} required value={f.inmuebleId} onChange={e => setF({ ...f, inmuebleId: e.target.value })} /></label>
      <label>ID de la persona (opcional)<input type="number" min={1} value={f.personaId} onChange={e => setF({ ...f, personaId: e.target.value })} /></label>
      <Select label="Tipo" value={f.tipoId} onChange={v => setF({ ...f, tipoId: v })}>{options(tipos)}</Select>
      <label>Remitente<b>*</b><input required value={f.remitente} onChange={e => setF({ ...f, remitente: e.target.value })} /></label>
      <label style={{ gridColumn: '1 / -1' }}>Descripción<input value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></label>
    </FormModal>}
    {deliver && <FormModal title={`Entregar de ${deliver.remitente}`} submitLabel="Entregar" onClose={() => setDeliver(null)} onSubmit={async () => {
      setItems(replaceIn(await api.correspondencia.entregar(deliver.id, { nombreRecibe: d.nombreRecibe, documentoRecibe: d.documentoRecibe || undefined })))
      setDeliver(null); notify('Correspondencia entregada')
    }}>
      <label>Nombre de quien recibe<b>*</b><input required value={d.nombreRecibe} onChange={e => setD({ ...d, nombreRecibe: e.target.value })} /></label>
      <label>Documento<input value={d.documentoRecibe} onChange={e => setD({ ...d, documentoRecibe: e.target.value })} /></label>
    </FormModal>}
  </>
}

/* ───────────── PQRS ───────────── */

const pqrsTone = (p: Pqrs) => (p.vencida ? 'amber' : p.estado.toLowerCase().startsWith('respond') ? 'green' : 'neutral')

export function RadicarPqrsPage({ notify, onDone }: { notify: Notify; onDone: () => void }) {
  const tipos = useCatalog('TIPO_PQRS')
  const [f, setF] = useState({ tipoId: '', asunto: '', descripcion: '', adjunto: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      await api.pqrs.radicar({ tipoId: +f.tipoId, asunto: f.asunto, descripcion: f.descripcion, adjunto: f.adjunto || undefined })
      notify('PQRS radicada'); onDone()
    } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }
  return <>
    <Header kicker="OPERACIONES · SOLICITUDES" title="Radicar PQRS" />
    <form className="form-card" onSubmit={submit}>
      <div className="fields-grid">
        <Select label="Tipo de solicitud" value={f.tipoId} onChange={v => setF({ ...f, tipoId: v })}>{options(tipos)}</Select>
        <label>Asunto<b>*</b><input required value={f.asunto} onChange={e => setF({ ...f, asunto: e.target.value })} /></label>
        <label style={{ gridColumn: '1 / -1' }}>Descripción de la situación<b>*</b><textarea required value={f.descripcion} onChange={e => setF({ ...f, descripcion: e.target.value })} /></label>
        <label>Adjunto (referencia, ej. nombre del archivo)<input value={f.adjunto} onChange={e => setF({ ...f, adjunto: e.target.value })} /></label>
      </div>
      <ErrorLine message={error} />
      <div className="form-actions"><button className="primary-btn" disabled={busy}>Enviar solicitud</button></div>
    </form>
  </>
}

// Persona vinculada: sus PQRS. Administrador: todas, con opción de responder.
export function PqrsListPage({ notify, admin }: { notify: Notify; admin: boolean }) {
  const { items, setItems, error } = useList<Pqrs>(admin ? api.pqrs.listar : api.pqrs.mias, [admin])
  const [attend, setAttend] = useState<Pqrs | null>(null)
  return <>
    <Header kicker={admin ? 'OPERACIONES · ATENCIÓN' : 'OPERACIONES · SOLICITUDES'} title={admin ? 'Atender PQRS' : 'Mis PQRS'} />
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Asunto', 'Tipo', ...(admin ? ['Solicitante'] : []), 'Radicada', 'Estado', 'Respuesta', ...(admin ? ['Acciones'] : [])]} foot={`${items.length} PQRS`}>
      {items.map(p => <tr key={p.id}>
        <td>{p.asunto}</td><td>{p.tipo}</td>{admin && <td>{p.solicitante}{p.inmueble ? ` · ${p.inmueble}` : ''}</td>}
        <td>{fecha(p.fechaRadicacion)}</td>
        <td><Badge tone={pqrsTone(p)}>{p.estado}{p.vencida ? ' · vencida' : ''}</Badge></td>
        <td>{p.respuesta ?? '—'}</td>
        {admin && <td>{!p.respuesta && <button className="row-action" onClick={() => setAttend(p)}>Responder</button>}</td>}
      </tr>)}
    </Table>}
    {attend && <TextPrompt title={`Responder: ${attend.asunto}`} label="Respuesta" area submitLabel="Enviar respuesta" onClose={() => setAttend(null)}
      onSubmit={async r => { setItems(replaceIn(await api.pqrs.atender(attend.id, r))); setAttend(null); notify('PQRS respondida') }} />}
  </>
}

/* ───────────── Mi perfil (persona vinculada: /api/perfil) ───────────── */

export function PerfilPage({ me, notify }: { me: Me; notify: Notify }) {
  const esPersona = me.rol === 'PERSONA_VINCULADA'
  const [persona, setPersona] = useState<Persona | null>(null)
  const [f, setF] = useState<PersonaForm>(emptyPersona)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!esPersona) return
    api.perfil.obtener().then(p => { setPersona(p); setF(formFromPersona(p)) }).catch(e => setError(errorMessage(e)))
  }, [esPersona])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try { const p = await api.perfil.actualizar(personaEdit(f)); setPersona(p); setF(formFromPersona(p)); notify('Perfil actualizado') }
    catch (err) { setError(errorMessage(err)) }
    setBusy(false)
  }

  return <>
    <Header kicker="TRANSVERSAL · CUENTA" title="Mi perfil" />
    <div className="profile-card" style={{ padding: 20 }}>
      <h3>{esPersona && persona ? `${persona.nombres} ${persona.apellidos}` : me.correo}</h3>
      <p>{me.correo} · {me.rol === 'ADMINISTRADOR' ? 'Administrador' : me.rol === 'VIGILANTE' ? 'Vigilante' : 'Persona vinculada'}</p>
      {esPersona && (persona === null && !error ? <p>Cargando…</p> : persona && <form onSubmit={submit}>
        <div className="fields-grid"><PersonaFields f={f} setF={setF} lockCore /></div>
        <ErrorLine message={error} />
        <div className="form-actions"><button className="primary-btn" disabled={busy}><Check size={16} /> Guardar cambios</button></div>
      </form>)}
      {esPersona && persona === null && <ErrorLine message={error} />}
      {!esPersona && <p style={{ fontSize: 13 }}>Esta cuenta no tiene una persona asociada para editar. Puedes cambiar tu contraseña más abajo.</p>}
    </div>
  </>
}
