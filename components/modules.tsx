'use client'

import { useEffect, useState } from 'react'
import { Check, Plus, Search, UserRound } from 'lucide-react'
import {
  api, errorMessage,
  type Catalogo, type Correspondencia, type Inmueble, type Parqueadero, type Persona, type Pqrs,
  type DirectorioInmueble, type Me, type TipoCatalogo, type Vehiculo,
} from '@/lib/api'
import { Badge, EliminarBtn, ConfirmModal, FormModal, TextPrompt, useFilter, emptyPersona, ErrorLine, formFromPersona, Header, Loading, Modal, PersonaFields, personaEdit, personaPayload, Correo, Placa, Unidad, useCatalog, useList, useTiposPersona, type PersonaForm } from './api-pages'

type Notify = (message: string) => void

export const fecha = (v: string | null) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—')

/* ───────────── utilidades compartidas ───────────── */

export { FormModal, TextPrompt, ConfirmModal }

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

export const replaceIn = <T extends { id: number }>(u: T) => (l: T[] | null) => (l ?? []).map(x => (x.id === u.id ? u : x))

/* ───────────── Personas ───────────── */

export function PersonasPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Persona>(api.personas.listar, [])
  const view = useFilter(items, p => `${p.nombres} ${p.apellidos} ${p.numeroDocumento} ${p.correo ?? ''} ${p.tipoPersona}`, p => p.activa)
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
    {view.bar}
    {items === null ? <Loading /> : <Table head={['Nombre', 'Documento', 'Tipo', 'Contacto', 'Vínculo', 'Estado', 'Acciones']} foot={view.foot('personas')}>
      {(view.shown ?? []).map(p => <tr key={p.id}>
        <td>{p.nombres} {p.apellidos}</td><td>{p.tipoDocumento} {p.numeroDocumento}</td><td>{p.tipoPersona}</td>
        <td>{p.correo ? <Correo value={p.correo} /> : p.telefono ?? '—'}</td>
        <td>{p.vinculoVigente ? `Inmueble #${p.inmuebleId}` : 'Sin vínculo'}</td>
        <td><Badge tone={p.activa ? 'green' : 'amber'}>{p.activa ? 'Activa' : 'Inactiva'}</Badge></td>
        <td><div className="btn-group">
          <button onClick={() => setEditing(p)}>Editar</button>
          {p.activa ? <button className="danger" onClick={() => setDeact(p)}>Desactivar</button> : <button onClick={() => reactivar(p)}>Reactivar</button>}
          {p.vinculoVigente && <button onClick={() => setEnding(p)}>Finalizar vínculo</button>}
          <button className="danger" onClick={() => setDel(p)}>Eliminar</button>
        </div></td>
      </tr>)}
    </Table>}
    {open && <NuevaPersona onClose={() => setOpen(false)} onCreated={p => { setItems(l => [...(l ?? []), p]); setOpen(false); notify('Persona creada') }} />}
    {editing && <EditarPersona persona={editing} onClose={() => setEditing(null)} onSaved={p => { setItems(replaceIn(p)); setEditing(null); notify('Persona actualizada') }}
      save={f => api.personas.actualizar(editing.id, personaEdit(f))} />}
    {ending && <TextPrompt title={`Finalizar vínculo de ${ending.nombres}`} label="Motivo" submitLabel="Finalizar vínculo" description="Termina el vínculo actual con el inmueble. La persona sigue activa y puede vincularse de nuevo." reasons={['Se mudó', 'Venta del inmueble', 'Fin del contrato de arriendo']} onClose={() => setEnding(null)}
      onSubmit={async motivo => { setItems(replaceIn(await api.personas.finalizarVinculo(ending.id, motivo))); setEnding(null); notify('Vínculo finalizado') }} />}
    {deact && <TextPrompt danger title={`Desactivar a ${deact.nombres} ${deact.apellidos}`} label="Motivo" submitLabel="Desactivar persona" description="La persona quedará inactiva y dejará de tener vínculo vigente (el inmueble puede pasar a no ocupado). Podrás reactivarla después." reasons={['Se mudó', 'Solicitud del residente', 'Registro duplicado', 'Fallecimiento']} onClose={() => setDeact(null)}
      onSubmit={async motivo => { setItems(replaceIn(await api.personas.desactivar(deact.id, motivo))); setDeact(null); notify('Persona desactivada') }} />}
    {del && <ConfirmModal title={`Eliminar a ${del.nombres} ${del.apellidos}`} confirmLabel="Eliminar definitivamente" onClose={() => setDel(null)}
      description="Se borra de forma definitiva y no se puede deshacer. Solo es posible si la persona no tiene historia (vínculos, cuenta, vehículos, PQRS, reservas…); si la tiene, usa Desactivar."
      details={[['Documento', `${del.tipoDocumento} ${del.numeroDocumento}`], ['Tipo', del.tipoPersona], ['Estado', del.activa ? 'Activa' : 'Inactiva']]}
      onConfirm={async () => { await api.personas.eliminar(del.id); setItems(l => (l ?? []).filter(x => x.id !== del.id)); setDel(null); notify('Persona eliminada') }} />}
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
  const view = useFilter(items, i => `${i.torreBloque}-${i.numero} ${i.tipo} ${i.propietario ?? ''}`, i => i.activo)
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
    {view.bar}
    {items === null ? <Loading /> : <Table head={['Inmueble', 'Piso', 'Tipo', 'Propietario', 'Estado', 'Acciones']} foot={view.foot('inmuebles')}>
      {(view.shown ?? []).map(i => <tr key={i.id}>
        <td><Unidad value={`${i.torreBloque}-${i.numero}`} /></td><td>{i.piso}</td><td>{i.tipo}</td><td>{i.propietario ?? '—'}</td>
        <td><Badge tone={!i.activo ? 'amber' : i.ocupado ? 'green' : 'neutral'}>{!i.activo ? 'Inactivo' : i.ocupado ? 'Ocupado' : 'Disponible'}</Badge></td>
        <td><div className="btn-group">
          <button onClick={() => openEdit(i)}>Editar</button>
          {i.activo ? <button className="danger" onClick={() => setOff(i)}>Desactivar</button> : <button onClick={() => reactivar(i)}>Reactivar</button>}
          <button className="danger" onClick={() => setDel(i)}>Eliminar</button>
        </div></td>
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
    {off && <TextPrompt danger title={`Desactivar inmueble ${off.torreBloque}-${off.numero}`} label="Motivo" submitLabel="Desactivar inmueble" description="Solo es posible si no tiene personas con vínculo vigente (finaliza antes sus vínculos). Un inmueble inactivo no admite nuevos vínculos." reasons={['Fuera de servicio', 'Remodelación', 'Registro duplicado']} onClose={() => setOff(null)}
      onSubmit={async motivo => { setItems(replaceIn(await api.inmuebles.desactivar(off.id, motivo))); setOff(null); notify('Inmueble desactivado') }} />}
    {del && <ConfirmModal title={`Eliminar inmueble ${del.torreBloque}-${del.numero}`} confirmLabel="Eliminar definitivamente" onClose={() => setDel(null)}
      description="Se borra de forma definitiva y no se puede deshacer. Solo es posible si nunca se usó (sin personas, vehículos, correspondencia, PQRS, reservas…); si tiene historia, usa Desactivar."
      details={[['Tipo', del.tipo], ['Piso', String(del.piso)], ['Estado', del.activo ? 'Activo' : 'Inactivo']]}
      onConfirm={async () => { await api.inmuebles.eliminar(del.id); setItems(l => (l ?? []).filter(x => x.id !== del.id)); setDel(null); notify('Inmueble eliminado') }} />}
  </>
}

/* ───────────── Vinculaciones ───────────── */

const iniciales = (p: Persona) => `${p.nombres[0] ?? ''}${p.apellidos[0] ?? ''}`.toUpperCase()

// Elegir una persona con búsqueda (por nombre o documento) en lugar de un desplegable largo.
function PersonaPicker({ personas, value, onChange }: { personas: Persona[]; value: string; onChange: (id: string) => void }) {
  const [q, setQ] = useState('')
  const n = q.trim().toLowerCase()
  const list = personas.filter(p => !n || `${p.nombres} ${p.apellidos} ${p.numeroDocumento}`.toLowerCase().includes(n))
  return <div style={{ gridColumn: '1 / -1' }}>
    <span className="field-label">Persona<b>*</b></span>
    <div className="search-field" style={{ maxWidth: 'none', marginBottom: 8 }}><Search size={16} />
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o documento…" aria-label="Buscar persona" /></div>
    <div className="pick-list" role="listbox" aria-label="Personas disponibles">
      {list.length === 0 ? <p className="pick-empty">{personas.length === 0 ? 'No hay personas activas sin vínculo. Crea una en Personas.' : 'Sin resultados.'}</p>
        : list.map(p => { const on = value === String(p.id); return <button key={p.id} type="button" role="option" aria-selected={on} className={`pick-item ${on ? 'on' : ''}`} onClick={() => onChange(String(p.id))}>
          <span className="avatar-sm">{iniciales(p)}</span>
          <span className="pick-text"><strong>{p.nombres} {p.apellidos}</strong><small>{p.tipoDocumento} {p.numeroDocumento}</small></span>
          {on && <Check size={16} />}
        </button> })}
    </div>
  </div>
}

type OcupacionFiltro = 'todos' | 'ocupados' | 'disponibles'

export function VinculacionesPage({ notify }: { notify: Notify }) {
  const tiposPersona = useTiposPersona()
  const inmuebles = useList<Inmueble>(api.inmuebles.listar, [])
  const personas = useList<Persona>(api.personas.listar, [])
  const [sel, setSel] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<OcupacionFiltro>('todos')
  const [moradores, setMoradores] = useState<Persona[] | null>(null)
  const [f, setF] = useState({ personaId: '', tipoPersonaId: '', fechaInicio: '' })
  const [ending, setEnding] = useState<Persona | null>(null)
  const [open, setOpen] = useState(false)

  const todos = inmuebles.items ?? []
  const actual = todos.find(i => i.id === sel) ?? null
  const needle = q.trim().toLowerCase()
  const lista = todos.filter(i =>
    (!needle || `${i.torreBloque}-${i.numero} ${i.tipo} ${i.propietario ?? ''}`.toLowerCase().includes(needle)) &&
    (filtro === 'todos' || (filtro === 'ocupados') === i.ocupado))
  const libres = (personas.items ?? []).filter(p => p.activa && !p.vinculoVigente)

  const load = (id: number | null) => {
    setMoradores(null)
    if (id !== null) api.inmuebles.personas(id).then(setMoradores).catch(e => { setMoradores([]); notify(errorMessage(e)) })
  }
  useEffect(() => load(sel), [sel]) // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = () => { load(sel); personas.reload(); inmuebles.reload() }

  const estado = (i: Inmueble) => (!i.activo ? ['Inactivo', 'amber'] : i.ocupado ? ['Ocupado', 'green'] : ['Disponible', 'neutral'])

  return <>
    <Header kicker="ADMINISTRACIÓN · VÍNCULOS" title="Vinculaciones" />
    <ErrorLine message={inmuebles.error || personas.error} />
    <div className="split" data-selected={sel !== null ? 'true' : 'false'}>
      <aside className="split-list">
        <div className="search-field" style={{ maxWidth: 'none', marginBottom: 10 }}><Search size={16} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar inmueble…" aria-label="Buscar inmueble" /></div>
        <div className="seg" role="group" aria-label="Ocupación" style={{ marginBottom: 10 }}>
          {([['todos', 'Todos'], ['ocupados', 'Ocupados'], ['disponibles', 'Disponibles']] as const).map(([k, label]) =>
            <button key={k} type="button" className={filtro === k ? 'on' : ''} onClick={() => setFiltro(k)}>{label}</button>)}
        </div>
        {inmuebles.items === null ? <Loading /> : <div className="pick-list tall" role="listbox" aria-label="Inmuebles">
          {lista.length === 0 ? <p className="pick-empty">Sin resultados.</p> : lista.map(i => { const [txt, tone] = estado(i); return <button key={i.id} type="button" role="option" aria-selected={sel === i.id}
            className={`pick-item ${sel === i.id ? 'on' : ''}`} onClick={() => setSel(i.id)}>
            <span className="pick-text"><strong>{i.torreBloque}-{i.numero}</strong><small>{i.tipo} · Piso {i.piso}{i.propietario ? ` · ${i.propietario}` : ''}</small></span>
            <Badge tone={tone}>{txt}</Badge>
          </button> })}
        </div>}
      </aside>

      <section className="split-detail">
        {!actual ? <div className="empty-panel"><p>Elige un inmueble de la lista para ver y gestionar a sus personas.</p></div> : <>
          <button type="button" className="back-link" onClick={() => setSel(null)}>← Todos los inmuebles</button>
          <div className="panel detail-head">
            <div>
              <h3><Unidad value={`${actual.torreBloque}-${actual.numero}`} /></h3>
              <p>{actual.tipo} · Piso {actual.piso}{actual.propietario ? ` · Propietario: ${actual.propietario}` : ''}</p>
              <Badge tone={estado(actual)[1]}>{estado(actual)[0]}</Badge>
            </div>
            <button className="primary-btn" disabled={!actual.activo} title={actual.activo ? undefined : 'Un inmueble inactivo no admite nuevos vínculos'}
              onClick={() => { setF({ personaId: '', tipoPersonaId: '', fechaInicio: '' }); setOpen(true) }}><Plus size={16} /> Vincular persona</button>
          </div>
          {moradores === null ? <Loading /> : moradores.length === 0
            ? <div className="empty-panel"><p>Este inmueble no tiene personas vinculadas.</p></div>
            : <Table head={['Persona', 'Tipo', 'Documento', 'Acciones']} foot={`${moradores.length} personas vinculadas`}>
              {moradores.map(p => <tr key={p.id}>
                <td>{p.nombres} {p.apellidos}</td><td>{p.tipoPersona}</td><td>{p.tipoDocumento} {p.numeroDocumento}</td>
                <td><div className="btn-group"><button onClick={() => setEnding(p)}>Finalizar vínculo</button></div></td>
              </tr>)}
            </Table>}
        </>}
      </section>
    </div>

    {open && actual && <FormModal title={`Vincular persona a ${actual.torreBloque}-${actual.numero}`} submitLabel="Vincular" onClose={() => setOpen(false)}
      description="Solo aparecen personas activas que aún no tienen un vínculo vigente." onSubmit={async () => {
        if (!f.personaId) throw new Error('Elige una persona')
        if (!f.tipoPersonaId) throw new Error('Elige el tipo de vínculo')
        await api.inmuebles.vincular(actual.id, { personaId: +f.personaId, tipoPersonaId: +f.tipoPersonaId, fechaInicio: f.fechaInicio || undefined })
        setOpen(false); refresh(); notify('Persona vinculada')
      }}>
      <PersonaPicker personas={libres} value={f.personaId} onChange={v => setF({ ...f, personaId: v })} />
      <div style={{ gridColumn: '1 / -1' }}>
        <span className="field-label">Tipo de vínculo<b>*</b></span>
        <div className="radio-cards">
          {tiposPersona.items.map(t => { const on = f.tipoPersonaId === String(t.id); return <label key={t.id} className={`radio-card ${on ? 'on' : ''}`}>
            <input type="radio" name="tipoVinculo" checked={on} onChange={() => setF({ ...f, tipoPersonaId: String(t.id) })} />
            <strong>{t.nombre}</strong><small>{t.descripcion}</small>
          </label> })}
        </div>
      </div>
      <label>Fecha de inicio (opcional, por defecto hoy)<input type="date" value={f.fechaInicio} onChange={e => setF({ ...f, fechaInicio: e.target.value })} /></label>
    </FormModal>}

    {ending && <TextPrompt title={`Finalizar vínculo de ${ending.nombres}`} label="Motivo" submitLabel="Finalizar vínculo"
      description="Termina el vínculo actual con el inmueble. La persona sigue activa y puede vincularse de nuevo." reasons={['Se mudó', 'Venta del inmueble', 'Fin del contrato de arriendo']}
      onClose={() => setEnding(null)} onSubmit={async motivo => { await api.personas.finalizarVinculo(ending.id, motivo); setEnding(null); refresh(); notify('Vínculo finalizado') }} />}
  </>
}

/* ───────────── Vehículos ───────────── */

export function VehiculosPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Vehiculo>(api.vehiculos.listar, [])
  const view = useFilter(items, v => `${v.placa} ${v.marca} ${v.color} ${v.responsable} ${v.inmueble}`, v => v.activo)
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
    {view.bar}
    {items === null ? <Loading /> : <Table head={['Placa', 'Tipo', 'Marca / color', 'Responsable', 'Inmueble', 'Estado', 'Acciones']} foot={view.foot('vehículos')}>
      {(view.shown ?? []).map(v => <tr key={v.id}>
        <td><Placa value={v.placa} /></td><td>{v.tipo}</td><td>{v.marca} · {v.color}</td><td>{v.responsable}</td><td>{v.inmueble}</td>
        <td><Badge tone={v.activo ? 'green' : 'amber'}>{v.activo ? 'Activo' : 'Inactivo'}</Badge></td>
        <td><div className="btn-group">{v.activo && <><button onClick={() => openEdit(v)}>Editar</button><button className="danger" onClick={() => setOff(v)}>Desactivar</button></>}
          <EliminarBtn nombre={`vehículo ${v.placa}`} notify={notify} run={() => api.vehiculos.eliminar(v.id)} onDone={() => setItems(l => (l ?? []).filter(x => x.id !== v.id))} /></div></td>
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
    {off && <TextPrompt danger title={`Desactivar vehículo ${off.placa}`} label="Motivo" submitLabel="Desactivar vehículo" description="El vehículo queda inactivo; el registro se conserva." reasons={['Vendido', 'Cambio de placa', 'Ya no ingresa al conjunto']} onClose={() => setOff(null)}
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
    {v && <div className="panel">
      <h3 className="result-head"><Placa value={v.placa} /> <Badge tone={v.activo ? 'green' : 'amber'}>{v.activo ? 'Activo' : 'Inactivo'}</Badge></h3>
      <dl className="kv">
        <div><dt>Tipo</dt><dd>{v.tipo}</dd></div><div><dt>Marca</dt><dd>{v.marca}</dd></div><div><dt>Color</dt><dd>{v.color}</dd></div>
        <div><dt>Responsable</dt><dd>{v.responsable}</dd></div><div><dt>Inmueble</dt><dd>{v.inmueble}</dd></div>
      </dl>
    </div>}
  </>
}

/* ───────────── Parqueaderos ───────────── */

export function ParqueaderosPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Parqueadero>(api.parqueaderos.listar, [])
  const view = useFilter(items, p => `${p.torreBloque}-${p.numero} ${p.tipo} ${p.inmuebleAsociado ?? ''}`, p => p.activo)
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
    {view.bar}
    {items === null ? <Loading /> : <Table head={['Parqueadero', 'Piso', 'Tipo', 'Asignado a', 'Estado', 'Acciones']} foot={view.foot('parqueaderos')}>
      {(view.shown ?? []).map(p => <tr key={p.id}>
        <td>{p.torreBloque}-{p.numero}</td><td>{p.piso}</td><td>{p.tipo}</td><td>{p.inmuebleAsociado ?? '—'}</td>
        <td><Badge tone={!p.activo ? 'amber' : p.disponible ? 'green' : 'neutral'}>{!p.activo ? 'Inactivo' : p.disponible ? 'Disponible' : 'Asignado'}</Badge></td>
        <td><div className="btn-group">{p.activo && <>{p.disponible
          ? <button onClick={() => { setInm(''); setAssign(p) }}>Asignar</button>
          : <button onClick={() => liberar(p)}>Liberar</button>}<button className="danger" onClick={() => setOff(p)}>Desactivar</button></>}
          <EliminarBtn nombre={`parqueadero ${p.torreBloque}-${p.numero}`} notify={notify} run={() => api.parqueaderos.eliminar(p.id)} onDone={() => setItems(l => (l ?? []).filter(x => x.id !== p.id))} /></div></td>
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
    {off && <TextPrompt danger title={`Desactivar parqueadero ${off.torreBloque}-${off.numero}`} label="Motivo" submitLabel="Desactivar parqueadero" description="No podrá asignarse mientras esté inactivo." reasons={['Fuera de servicio', 'En reparación', 'Error de registro']} onClose={() => setOff(null)}
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
  // Directorio del vigilante: inmuebles activos con sus residentes (evita escribir ids).
  const dir = useList<DirectorioInmueble>(isGuard ? api.accesos.inmuebles : async () => [], [isGuard])
  const residentes = (dir.items ?? []).flatMap(i => i.residentes.map(r => ({ id: r.id, texto: `${r.nombre} · ${i.torreBloque}-${i.numero}` })))
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ inmuebleId: '', personaId: '', tipoId: '', remitente: '', descripcion: '' })
  const inmuebleSel = (dir.items ?? []).find(i => String(i.id) === f.inmuebleId)
  const [deliver, setDeliver] = useState<Correspondencia | null>(null)
  const [d, setD] = useState({ nombreRecibe: '', documentoRecibe: '' })

  return <>
    <Header kicker="OPERACIONES · RECEPCIÓN" title="Correspondencia">
      {isGuard && <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Registrar</button>}
    </Header>
    {isGuard && <div className="table-toolbar" style={{ marginBottom: 12 }}>
      <select value={filtro} onChange={e => setFiltro(e.target.value)} aria-label="Destinatario"><option value="">Todos los destinatarios</option>{residentes.map(r => <option key={r.id} value={r.id}>{r.texto}</option>)}</select>
    </div>}
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Remitente', 'Destinatario', 'Recepción', 'Tipo', 'Estado', 'Entrega', ...(isGuard ? ['Acciones'] : [])]} foot={`${items.length} registros`}>
      {items.map(c => <tr key={c.id}>
        <td>{c.remitente}{c.descripcion && <small className="preview">{c.descripcion}</small>}</td><td>{c.destinatario ?? 'Inmueble'} · {c.inmueble}</td><td>{fecha(c.fechaRecepcion)}</td><td>{c.tipo}</td>
        <td><Badge tone={corrTone(c.estado)}>{c.estado}</Badge></td>
        <td>{c.fechaEntrega ? <>{c.nombreRecibe ?? 'Entregada'}<small className="sub">{fecha(c.fechaEntrega)}</small></> : <span className="dash">—</span>}</td>
        {isGuard && <td>{!c.fechaEntrega && <div className="btn-group"><button onClick={() => { setD({ nombreRecibe: '', documentoRecibe: '' }); setDeliver(c) }}>Entregar</button></div>}</td>}
      </tr>)}
    </Table>}
    {open && <FormModal title="Registrar correspondencia" submitLabel="Registrar" onClose={() => setOpen(false)} onSubmit={async () => {
      const c = await api.correspondencia.crear({ inmuebleId: +f.inmuebleId, personaId: f.personaId ? +f.personaId : undefined, tipoId: +f.tipoId, remitente: f.remitente, descripcion: f.descripcion || undefined })
      setItems(l => [c, ...(l ?? [])]); setOpen(false); notify('Correspondencia registrada')
    }}>
      <Select label="Inmueble" value={f.inmuebleId} onChange={v => setF({ ...f, inmuebleId: v, personaId: '' })}>{(dir.items ?? []).map(i => <option key={i.id} value={i.id}>{i.torreBloque}-{i.numero}</option>)}</Select>
      <Select label="Destinatario" required={false} value={f.personaId} onChange={v => setF({ ...f, personaId: v })}>{(inmuebleSel?.residentes ?? []).map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select>
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

// Todo lo que la persona escribió y lo que se le respondió, completo. El administrador puede pasar de aquí a responder.
function PqrsDetalle({ p, admin, onClose, onReply }: { p: Pqrs; admin: boolean; onClose: () => void; onReply: () => void }) {
  return <Modal title={p.asunto} onClose={onClose}>
    <div className="modal-body">
      <div className="result-head"><Badge tone={pqrsTone(p)}>{p.estado}{p.vencida ? ' · vencida' : ''}</Badge></div>
      <dl className="kv">
        <div><dt>Tipo</dt><dd>{p.tipo}</dd></div>
        <div><dt>Radicada</dt><dd>{fecha(p.fechaRadicacion)}</dd></div>
        {admin && <div><dt>Solicitante</dt><dd>{p.solicitante}{p.inmueble ? ` · ${p.inmueble}` : ''}</dd></div>}
        {p.adjunto && <div><dt>Adjunto</dt><dd>{p.adjunto}</dd></div>}
      </dl>
      <h4 className="block-title">Descripción</h4>
      <p className="prose">{p.descripcion}</p>
      {p.respuesta && <>
        <h4 className="block-title">Respuesta · {fecha(p.fechaRespuesta)}</h4>
        <p className="prose">{p.respuesta}</p>
      </>}
      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onClose}>Cerrar</button>
        {admin && !p.respuesta && <button type="button" className="primary-btn" onClick={onReply}>Responder</button>}
      </div>
    </div>
  </Modal>
}

// Persona vinculada: sus PQRS. Administrador: todas, con opción de responder.
export function PqrsListPage({ notify, admin }: { notify: Notify; admin: boolean }) {
  const { items, setItems, error } = useList<Pqrs>(admin ? api.pqrs.listar : api.pqrs.mias, [admin])
  const [view, setView] = useState<Pqrs | null>(null)
  const [attend, setAttend] = useState<Pqrs | null>(null)
  return <>
    <Header kicker={admin ? 'OPERACIONES · ATENCIÓN' : 'OPERACIONES · SOLICITUDES'} title={admin ? 'Atender PQRS' : 'Mis PQRS'} />
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Asunto', 'Tipo', ...(admin ? ['Solicitante'] : []), 'Radicada', 'Estado', 'Respuesta', 'Acciones']} foot={`${items.length} PQRS`}>
      {items.map(p => <tr key={p.id}>
        <td>{p.asunto}{p.descripcion && <small className="preview">{p.descripcion}</small>}</td><td>{p.tipo}</td>{admin && <td>{p.solicitante}{p.inmueble ? ` · ${p.inmueble}` : ''}</td>}
        <td>{fecha(p.fechaRadicacion)}</td>
        <td><Badge tone={pqrsTone(p)}>{p.estado}{p.vencida ? ' · vencida' : ''}</Badge></td>
        <td>{p.respuesta ? <span className="clamp">{p.respuesta}</span> : '—'}</td>
        <td><div className="btn-group"><button onClick={() => setView(p)}>Ver</button>
          {admin && !p.respuesta && <><button onClick={() => setAttend(p)}>Responder</button>
            <EliminarBtn nombre={`PQRS: ${p.asunto}`} notify={notify} run={() => api.pqrs.eliminar(p.id)} onDone={() => setItems(l => (l ?? []).filter(x => x.id !== p.id))} /></>}</div></td>
      </tr>)}
    </Table>}
    {view && <PqrsDetalle p={view} admin={admin} onClose={() => setView(null)} onReply={() => { setAttend(view); setView(null) }} />}
    {attend && <TextPrompt title={`Responder: ${attend.asunto}`} label="Respuesta" area submitLabel="Enviar respuesta" onClose={() => setAttend(null)}
      description={<>{attend.solicitante} recibirá una notificación con tu respuesta. Esto fue lo que escribió:
        <blockquote className="quote">{attend.descripcion}{attend.adjunto && <small>Adjunto: {attend.adjunto}</small>}</blockquote></>}
      onSubmit={async r => { setItems(replaceIn(await api.pqrs.atender(attend.id, r))); setAttend(null); notify('PQRS respondida') }} />}
  </>
}

/* ───────────── Mi perfil (persona vinculada: /api/perfil) ───────────── */

export function PerfilPage({ me, notify, children }: { me: Me; notify: Notify; children?: React.ReactNode }) {
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

  const rolLabel = me.rol === 'ADMINISTRADOR' ? 'Administrador' : me.rol === 'VIGILANTE' ? 'Vigilante' : 'Persona vinculada'
  const nombre = esPersona && persona ? `${persona.nombres} ${persona.apellidos}` : me.correo.split('@')[0]
  const iniciales = (esPersona && persona ? `${persona.nombres[0] ?? ''}${persona.apellidos[0] ?? ''}` : me.correo.slice(0, 2)).toUpperCase()
  const datos: { label: string; value: string }[] = [
    { label: 'Rol', value: rolLabel },
    { label: 'Correo de acceso', value: me.correo },
    ...(esPersona && persona ? [
      { label: 'Documento', value: `${persona.tipoDocumento} ${persona.numeroDocumento}` },
      { label: 'Tipo de persona', value: persona.tipoPersona },
      { label: 'Inmueble', value: persona.vinculoVigente ? `Inmueble #${persona.inmuebleId}` : 'Sin vínculo vigente' },
    ] : []),
  ]

  return <>
    <Header kicker="TRANSVERSAL · CUENTA" title="Mi perfil" />
    <section className="pf-hero">
      <span className="pf-avatar">{iniciales}</span>
      <div className="pf-id"><h3>{nombre}</h3><p>{me.correo}</p></div>
      <div className="pf-tags"><Badge tone="neutral">{rolLabel}</Badge>{esPersona && persona && <Badge tone={persona.activa ? 'green' : 'amber'}>{persona.activa ? 'Activa' : 'Inactiva'}</Badge>}</div>
    </section>
    <dl className="kv boxed">{datos.map(d => <div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>)}</dl>
    <div className="pf-grid">
      <section className="pf-module">
        <div className="pf-module-head"><UserRound size={16} /><h4>Datos personales</h4></div>
        {esPersona && (persona === null && !error ? <p>Cargando…</p> : persona && <form onSubmit={submit}>
          <div className="fields-grid"><PersonaFields f={f} setF={setF} lockCore /></div>
          <ErrorLine message={error} />
          <div className="form-actions"><button className="primary-btn" disabled={busy}><Check size={16} /> Guardar cambios</button></div>
        </form>)}
        {esPersona && persona === null && <ErrorLine message={error} />}
        {!esPersona && <p>Esta cuenta no tiene una persona asociada para editar. Puedes cambiar tu contraseña en el módulo de seguridad.</p>}
      </section>
      {children}
    </div>
  </>
}
