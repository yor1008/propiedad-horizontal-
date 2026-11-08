'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { api, errorMessage, type Mantenimiento, type Zona } from '@/lib/api'
import { Badge, ErrorLine, Header, Loading, useCatalog, useList } from './api-pages'
import { FormModal, Select, Table, TextPrompt, replaceIn } from './modules'

type Notify = (message: string) => void

const when = (v: string | null) => (v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const local = (v: string | null) => (v ? v.slice(0, 16) : '') // yyyy-MM-ddTHH:mm para <input type="datetime-local">
const tone = (e: string) => (e === 'En curso' ? 'green' : e === 'Programado' ? 'amber' : 'neutral')

export function MantenimientosPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Mantenimiento>(api.mantenimientos.listar, [])
  const [form, setForm] = useState<{ edit?: Mantenimiento } | null>(null)
  const [cancel, setCancel] = useState<Mantenimiento | null>(null)
  const [finish, setFinish] = useState<Mantenimiento | null>(null)
  const [obs, setObs] = useState('')

  async function iniciar(m: Mantenimiento) {
    try { setItems(replaceIn(await api.mantenimientos.iniciar(m.id))); notify('Mantenimiento iniciado') } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="OPERACIONES · INFRAESTRUCTURA" title="Mantenimientos">
      <button className="primary-btn" onClick={() => setForm({})}><Plus size={16} /> Programar</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Elemento / área', 'Tipo', 'Zona', 'Inicio', 'Fin', 'Responsable', 'Estado', 'Acciones']} foot={`${items.length} mantenimientos`}>
      {items.map(m => <tr key={m.id}>
        <td>{m.elementoArea}<br /><small>{m.descripcion}</small></td><td>{m.tipo}</td><td>{m.zonaComun ?? 'General'}</td>
        <td>{when(m.fechaHoraInicio)}</td><td>{when(m.fechaHoraFin)}</td><td>{m.responsable ?? '—'}</td>
        <td><Badge tone={tone(m.estado)}>{m.estado}</Badge>{m.motivoCancelacion && <small> · {m.motivoCancelacion}</small>}</td>
        <td>
          {m.estado === 'Programado' && <><button className="row-action" onClick={() => iniciar(m)}>Iniciar</button>{' '}<button className="row-action" onClick={() => setForm({ edit: m })}>Editar</button>{' '}</>}
          {m.estado === 'En curso' && <><button className="row-action" onClick={() => { setObs(''); setFinish(m) }}>Finalizar</button>{' '}</>}
          {(m.estado === 'Programado' || m.estado === 'En curso') && <button className="row-action" onClick={() => setCancel(m)}>Cancelar</button>}
        </td>
      </tr>)}
    </Table>}
    {form && <MantenimientoModal edit={form.edit} onClose={() => setForm(null)} onSaved={m => {
      setItems(l => (form.edit ? replaceIn(m)(l) : [m, ...(l ?? [])])); setForm(null); notify('Mantenimiento guardado')
    }} />}
    {cancel && <TextPrompt title={`Cancelar: ${cancel.elementoArea}`} label="Motivo" submitLabel="Cancelar mantenimiento" onClose={() => setCancel(null)}
      onSubmit={async motivo => { setItems(replaceIn(await api.mantenimientos.cancelar(cancel.id, motivo))); setCancel(null); notify('Mantenimiento cancelado') }} />}
    {finish && <FormModal title={`Finalizar: ${finish.elementoArea}`} submitLabel="Finalizar" onClose={() => setFinish(null)} onSubmit={async () => {
      setItems(replaceIn(await api.mantenimientos.finalizar(finish.id, obs.trim() || undefined))); setFinish(null); notify('Mantenimiento completado')
    }}>
      <label style={{ gridColumn: '1 / -1' }}>Observaciones (opcional)<textarea value={obs} onChange={e => setObs(e.target.value)} /></label>
    </FormModal>}
  </>
}

// Al crear: zona (opcional), tipo, elemento, fechas. Al editar solo cambian descripción, fechas y responsable.
function MantenimientoModal({ edit, onClose, onSaved }: { edit?: Mantenimiento; onClose: () => void; onSaved: (m: Mantenimiento) => void }) {
  const zonas = useList<Zona>(api.zonas.activas, [])
  const tipos = useCatalog('TIPO_MANTENIMIENTO')
  const [f, setF] = useState({
    zonaComunId: edit?.zonaComunId ? String(edit.zonaComunId) : '', tipoId: '', elementoArea: edit?.elementoArea ?? '',
    descripcion: edit?.descripcion ?? '', inicio: local(edit?.fechaHoraInicio ?? null), fin: local(edit?.fechaHoraFin ?? null), responsable: edit?.responsable ?? '',
  })
  const set = (k: keyof typeof f) => (v: string) => setF(s => ({ ...s, [k]: v }))

  return <FormModal title={edit ? `Editar ${edit.elementoArea}` : 'Programar mantenimiento'} submitLabel="Guardar" onClose={onClose} onSubmit={async () => {
    onSaved(edit
      ? await api.mantenimientos.actualizar(edit.id, { descripcion: f.descripcion, fechaHoraInicio: f.inicio, fechaHoraFin: f.fin || undefined, responsable: f.responsable || undefined })
      : await api.mantenimientos.crear({
        zonaComunId: f.zonaComunId ? +f.zonaComunId : undefined, tipoId: +f.tipoId, elementoArea: f.elementoArea, descripcion: f.descripcion,
        fechaHoraInicio: f.inicio, fechaHoraFin: f.fin || undefined, responsable: f.responsable || undefined,
      }))
  }}>
    {!edit && <>
      <Select label="Tipo de mantenimiento" value={f.tipoId} onChange={set('tipoId')}>{tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Select>
      <label>Elemento o área<b>*</b><input required value={f.elementoArea} onChange={e => set('elementoArea')(e.target.value)} placeholder="Piscina, ascensor, portería…" /></label>
      <label style={{ gridColumn: '1 / -1' }}>Zona común (bloquea sus reservas durante el mantenimiento)
        <select value={f.zonaComunId} onChange={e => set('zonaComunId')(e.target.value)}>
          <option value="">Ninguna (mantenimiento general)</option>
          {(zonas.items ?? []).map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}</select></label>
    </>}
    <label style={{ gridColumn: '1 / -1' }}>Descripción<b>*</b><input required value={f.descripcion} onChange={e => set('descripcion')(e.target.value)} /></label>
    <label>Inicio<b>*</b><input type="datetime-local" required value={f.inicio} onChange={e => set('inicio')(e.target.value)} /></label>
    <label>Fin (opcional)<input type="datetime-local" value={f.fin} onChange={e => set('fin')(e.target.value)} /></label>
    <label style={{ gridColumn: '1 / -1' }}>Responsable<input value={f.responsable} onChange={e => set('responsable')(e.target.value)} /></label>
  </FormModal>
}
