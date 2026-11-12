'use client'

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  api, DIAS_SEMANA, errorMessage,
  type Disponibilidad, type Horario, type NuevaZona, type PeriodoLimite, type Reserva, type TipoUsoZona, type Zona,
} from '@/lib/api'
import { Badge, EliminarBtn, ErrorLine, Header, Loading, useList } from './api-pages'
import { FormModal, Select, Table, TextPrompt, fecha, replaceIn } from './modules'

type Notify = (message: string) => void

const dia = (d: string) => d.charAt(0) + d.slice(1).toLowerCase()
const hh = (t: string) => t.slice(0, 5)
const estadoTone = (e: string) => (e === 'Aprobada' ? 'green' : e === 'Pendiente' ? 'amber' : e === 'Finalizada' ? 'neutral' : 'amber')
const dia_fecha = (f: string) => new Date(`${f}T00:00:00`).toLocaleDateString('es-CO', { dateStyle: 'medium' })

/* ───────────── Zonas comunes (admin) ───────────── */

type ZonaForm = {
  nombre: string; descripcion: string; capacidadMaxima: string; tipoUso: TipoUsoZona; requiereAprobacion: boolean
  duracionMaximaMinutos: string; anticipacionMinimaHoras: string; anticipacionMaximaDias: string
  limiteCancelacionHoras: string; maxReservasPorInmueble: string; periodoLimite: PeriodoLimite | ''; horarios: Horario[]
}
const emptyZona: ZonaForm = {
  nombre: '', descripcion: '', capacidadMaxima: '', tipoUso: 'EXCLUSIVO', requiereAprobacion: false,
  duracionMaximaMinutos: '0', anticipacionMinimaHoras: '0', anticipacionMaximaDias: '0', limiteCancelacionHoras: '0',
  maxReservasPorInmueble: '0', periodoLimite: '', horarios: [{ diaSemana: 'SABADO', horaInicio: '08:00', horaFin: '18:00' }],
}
const zonaToForm = (z: Zona): ZonaForm => ({
  nombre: z.nombre, descripcion: z.descripcion ?? '', capacidadMaxima: String(z.capacidadMaxima), tipoUso: z.tipoUso,
  requiereAprobacion: z.requiereAprobacion, duracionMaximaMinutos: String(z.duracionMaximaMinutos),
  anticipacionMinimaHoras: String(z.anticipacionMinimaHoras), anticipacionMaximaDias: String(z.anticipacionMaximaDias),
  limiteCancelacionHoras: String(z.limiteCancelacionHoras), maxReservasPorInmueble: String(z.maxReservasPorInmueble),
  periodoLimite: z.periodoLimite ?? '', horarios: z.horarios.map(h => ({ ...h, horaInicio: hh(h.horaInicio), horaFin: hh(h.horaFin) })),
})
const formToZona = (f: ZonaForm): NuevaZona => ({
  nombre: f.nombre, descripcion: f.descripcion, capacidadMaxima: +f.capacidadMaxima, tipoUso: f.tipoUso,
  requiereAprobacion: f.requiereAprobacion, duracionMaximaMinutos: +f.duracionMaximaMinutos,
  anticipacionMinimaHoras: +f.anticipacionMinimaHoras, anticipacionMaximaDias: +f.anticipacionMaximaDias,
  limiteCancelacionHoras: +f.limiteCancelacionHoras, maxReservasPorInmueble: +f.maxReservasPorInmueble,
  periodoLimite: f.periodoLimite || undefined, horarios: f.horarios,
})

export function ZonasPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<Zona>(api.zonas.todas, [])
  const [form, setForm] = useState<{ edit?: Zona } | null>(null)
  const [off, setOff] = useState<Zona | null>(null)

  async function reactivar(z: Zona) {
    try { setItems(replaceIn(await api.zonas.reactivar(z.id))); notify('Zona reactivada') } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="OPERACIONES · ESPACIOS" title="Zonas comunes">
      <button className="primary-btn" onClick={() => setForm({})}><Plus size={16} /> Nueva zona</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Zona', 'Capacidad', 'Uso', 'Aprobación', 'Horarios', 'Estado', 'Acciones']} foot={`${items.length} zonas`}>
      {items.map(z => <tr key={z.id}>
        <td>{z.nombre}</td><td>{z.capacidadMaxima}</td><td>{z.tipoUso === 'EXCLUSIVO' ? 'Exclusivo' : 'Compartido'}</td>
        <td>{z.requiereAprobacion ? 'Requiere' : 'Automática'}</td>
        <td>{z.horarios.map(h => `${dia(h.diaSemana).slice(0, 3)} ${hh(h.horaInicio)}–${hh(h.horaFin)}`).join(' · ')}</td>
        <td><Badge tone={z.activa ? 'green' : 'amber'}>{z.activa ? 'Activa' : 'Inactiva'}</Badge></td>
        <td><div className="btn-group"><button onClick={() => setForm({ edit: z })}>Editar</button>
          {z.activa ? <button className="danger" onClick={() => setOff(z)}>Desactivar</button> : <button onClick={() => reactivar(z)}>Reactivar</button>}
          <EliminarBtn nombre={z.nombre} notify={notify} run={() => api.zonas.eliminar(z.id)} onDone={() => setItems(l => (l ?? []).filter(x => x.id !== z.id))} /></div></td>
      </tr>)}
    </Table>}
    {form && <ZonaModal edit={form.edit} onClose={() => setForm(null)} onSaved={z => {
      setItems(l => (form.edit ? replaceIn(z)(l) : [...(l ?? []), z])); setForm(null); notify('Zona guardada')
    }} />}
    {off && <TextPrompt danger title={`Desactivar ${off.nombre}`} label="Motivo" submitLabel="Desactivar zona" description="Dejará de aparecer para reservar. Podrás reactivarla después." reasons={['En remodelación', 'Fuera de servicio', 'Decisión de la administración']} onClose={() => setOff(null)}
      onSubmit={async m => { setItems(replaceIn(await api.zonas.desactivar(off.id, m))); setOff(null); notify('Zona desactivada') }} />}
  </>
}

function ZonaModal({ edit, onClose, onSaved }: { edit?: Zona; onClose: () => void; onSaved: (z: Zona) => void }) {
  const [f, setF] = useState<ZonaForm>(edit ? zonaToForm(edit) : emptyZona)
  const set = <K extends keyof ZonaForm>(k: K, v: ZonaForm[K]) => setF(s => ({ ...s, [k]: v }))
  const setH = (i: number, patch: Partial<Horario>) => set('horarios', f.horarios.map((h, j) => (j === i ? { ...h, ...patch } : h)))
  const needsPeriod = +f.maxReservasPorInmueble > 0

  return <FormModal title={edit ? `Editar ${edit.nombre}` : 'Nueva zona común'} submitLabel="Guardar" onClose={onClose} onSubmit={async () => {
    if (!f.horarios.length) throw new Error('Agrega al menos un horario')
    const body = formToZona(f)
    onSaved(edit ? await api.zonas.actualizar(edit.id, body) : await api.zonas.crear(body))
  }}>
    <label>Nombre<b>*</b><input required value={f.nombre} onChange={e => set('nombre', e.target.value)} /></label>
    <label>Capacidad máxima<b>*</b><input type="number" min={1} required value={f.capacidadMaxima} onChange={e => set('capacidadMaxima', e.target.value)} /></label>
    <label style={{ gridColumn: '1 / -1' }}>Descripción<input value={f.descripcion} onChange={e => set('descripcion', e.target.value)} /></label>
    <label>Tipo de uso<b>*</b><select value={f.tipoUso} onChange={e => set('tipoUso', e.target.value as TipoUsoZona)}>
      <option value="EXCLUSIVO">Exclusivo</option><option value="COMPARTIDO">Compartido</option></select></label>
    <label style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><input type="checkbox" style={{ width: 'auto' }} checked={f.requiereAprobacion} onChange={e => set('requiereAprobacion', e.target.checked)} /> Requiere aprobación del administrador</label>
    <label>Duración máxima (min)<input type="number" min={0} value={f.duracionMaximaMinutos} onChange={e => set('duracionMaximaMinutos', e.target.value)} /></label>
    <label>Anticipación mínima (horas)<input type="number" min={0} value={f.anticipacionMinimaHoras} onChange={e => set('anticipacionMinimaHoras', e.target.value)} /></label>
    <label>Anticipación máxima (días)<input type="number" min={0} value={f.anticipacionMaximaDias} onChange={e => set('anticipacionMaximaDias', e.target.value)} /></label>
    <label>Límite para cancelar (horas)<input type="number" min={0} value={f.limiteCancelacionHoras} onChange={e => set('limiteCancelacionHoras', e.target.value)} /></label>
    <label>Máx. reservas por inmueble<input type="number" min={0} value={f.maxReservasPorInmueble} onChange={e => set('maxReservasPorInmueble', e.target.value)} /></label>
    <label>Periodo del límite{needsPeriod && <b>*</b>}<select required={needsPeriod} value={f.periodoLimite} onChange={e => set('periodoLimite', e.target.value as PeriodoLimite | '')}>
      <option value="">—</option><option value="DIA">Día</option><option value="SEMANA">Semana</option><option value="MES">Mes</option></select></label>
    <div style={{ gridColumn: '1 / -1' }}>
      <span className="field-label">Horarios<b>*</b></span>
      {f.horarios.map((h, i) => <div key={i} className="hours-row">
        <select value={h.diaSemana} onChange={e => setH(i, { diaSemana: e.target.value as Horario['diaSemana'] })}>{DIAS_SEMANA.map(d => <option key={d} value={d}>{dia(d)}</option>)}</select>
        <input type="time" required value={h.horaInicio} onChange={e => setH(i, { horaInicio: e.target.value })} />
        <input type="time" required value={h.horaFin} onChange={e => setH(i, { horaFin: e.target.value })} />
        <button type="button" className="row-action" aria-label="Quitar horario" onClick={() => set('horarios', f.horarios.filter((_, j) => j !== i))}><X size={14} /></button>
      </div>)}
      <button type="button" className="row-action" onClick={() => set('horarios', [...f.horarios, { diaSemana: 'LUNES', horaInicio: '08:00', horaFin: '18:00' }])}>+ Agregar horario</button>
    </div>
  </FormModal>
}

/* ───────────── Reservar zona (residente) ───────────── */

export function ReservarPage({ notify, onDone }: { notify: Notify; onDone: () => void }) {
  const zonas = useList<Zona>(api.zonas.activas, [])
  const [f, setF] = useState({ zonaId: '', fecha: '', horaInicio: '', horaFin: '', numeroAsistentes: '', motivo: '' })
  const [disp, setDisp] = useState<Disponibilidad | null>(null)
  const [dispError, setDispError] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const zona = (zonas.items ?? []).find(z => String(z.id) === f.zonaId)

  useEffect(() => {
    setDisp(null); setDispError('')
    if (f.zonaId && f.fecha) api.zonas.disponibilidad(+f.zonaId, f.fecha).then(setDisp).catch(e => setDispError(errorMessage(e)))
  }, [f.zonaId, f.fecha])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const r = await api.reservas.crear({ zonaId: +f.zonaId, fecha: f.fecha, horaInicio: f.horaInicio, horaFin: f.horaFin, numeroAsistentes: +f.numeroAsistentes, motivo: f.motivo || undefined })
      notify(r.estado === 'Pendiente' ? 'Reserva enviada; queda pendiente de aprobación' : 'Reserva confirmada'); onDone()
    } catch (err) { setError(errorMessage(err)); setBusy(false) }
  }

  return <>
    <Header kicker="OPERACIONES · ESPACIOS" title="Reservar zona" />
    <ErrorLine message={zonas.error} />
    <form className="form-card" onSubmit={submit}>
      <div className="fields-grid">
        <Select label="Zona común" value={f.zonaId} onChange={v => setF({ ...f, zonaId: v })}>{(zonas.items ?? []).map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}</Select>
        <label>Fecha<b>*</b><input type="date" required value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></label>
        <label>Hora de inicio<b>*</b><input type="time" required value={f.horaInicio} onChange={e => setF({ ...f, horaInicio: e.target.value })} /></label>
        <label>Hora de fin<b>*</b><input type="time" required value={f.horaFin} onChange={e => setF({ ...f, horaFin: e.target.value })} /></label>
        <label>Asistentes (incluyéndote)<b>*</b><input type="number" min={1} max={zona?.capacidadMaxima} required value={f.numeroAsistentes} onChange={e => setF({ ...f, numeroAsistentes: e.target.value })} /></label>
        <label>Motivo<input value={f.motivo} onChange={e => setF({ ...f, motivo: e.target.value })} /></label>
      </div>
      {zona && <p className="dialog-desc" style={{ margin: '16px 0 0' }}>Capacidad: {zona.capacidadMaxima} · {zona.requiereAprobacion ? 'requiere aprobación del administrador' : 'se confirma automáticamente'}</p>}
      {f.fecha && f.zonaId && <div className="info-box">
        {dispError ? <ErrorLine message={dispError} /> : !disp ? 'Consultando disponibilidad…' : <>
          <div><b>Horario ese día:</b> {disp.horarios.length ? disp.horarios.map(h => `${hh(h.horaInicio)}–${hh(h.horaFin)}`).join(', ') : 'la zona no abre'}</div>
          <div><b>Ya reservado:</b> {disp.ocupadas.length ? disp.ocupadas.map(o => `${hh(o.horaInicio)}–${hh(o.horaFin)} (${o.estado})`).join(', ') : 'nada, todo libre'}</div></>}
      </div>}
      <ErrorLine message={error} />
      <div className="form-actions"><button className="primary-btn" disabled={busy}>Reservar</button></div>
    </form>
  </>
}

/* ───────────── Mis reservas (residente) y gestión (admin) ───────────── */

export function ReservasPage({ notify, admin }: { notify: Notify; admin: boolean }) {
  const { items, setItems, error } = useList<Reserva>(admin ? api.reservas.listar : api.reservas.mias, [admin])
  const [prompt, setPrompt] = useState<{ r: Reserva; kind: 'cancelar' | 'rechazar' | 'anular' } | null>(null)
  const [approve, setApprove] = useState<Reserva | null>(null)
  const [cond, setCond] = useState('')

  async function finalizar(r: Reserva) {
    try { setItems(replaceIn(await api.reservas.finalizar(r.id))); notify('Reserva finalizada') } catch (e) { notify(errorMessage(e)) }
  }

  const titles = { cancelar: 'Cancelar', rechazar: 'Rechazar', anular: 'Anular' }
  const descs = {
    cancelar: 'Cancelas tu reserva y el horario queda libre.',
    rechazar: 'El solicitante recibirá una notificación con este motivo.',
    anular: 'Cancela la reserva sin límite de horas; el solicitante recibirá una notificación.',
  }
  const reasonsBy = {
    cancelar: ['Cambio de planes', 'Ya no es necesaria'],
    rechazar: ['Horario no disponible', 'No cumple las condiciones de uso', 'Aforo excedido'],
    anular: ['Mantenimiento de la zona', 'Incumplimiento de normas', 'Solicitud del residente'],
  }

  // Lo que la administración dejó dicho: las condiciones de uso al aprobar o el motivo si se rechazó o canceló.
  // La columna solo aparece si alguna reserva tiene algo que mostrar.
  const nota = (r: Reserva) => (r.condicionesUso ? `Condiciones de uso: ${r.condicionesUso}` : r.motivoRechazoCancelacion ? `Motivo: ${r.motivoRechazoCancelacion}` : '')
  const hayNotas = (items ?? []).some(r => nota(r))

  return <>
    <Header kicker="OPERACIONES · ESPACIOS" title={admin ? 'Gestionar reservas' : 'Mis reservas'} />
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Zona', ...(admin ? ['Solicitante'] : []), 'Fecha', 'Horario', 'Asistentes', 'Estado', ...(hayNotas ? ['Observaciones'] : []), 'Acciones']} foot={`${items.length} reservas`}>
      {items.map(r => <tr key={r.id}>
        <td>{r.zona}{r.motivo && <small className="preview">{r.motivo}</small>}</td>{admin && <td>{r.solicitante} · {r.inmueble}</td>}
        <td>{dia_fecha(r.fecha)}</td><td>{hh(r.horaInicio)} – {hh(r.horaFin)}</td><td>{r.numeroAsistentes}</td>
        <td><Badge tone={estadoTone(r.estado)}>{r.estado}</Badge></td>
        {hayNotas && <td>{nota(r)}</td>}
        <td><div className="btn-group">
          {admin ? <>
            {r.estado === 'Pendiente' && <><button onClick={() => { setCond(''); setApprove(r) }}>Aprobar</button><button className="danger" onClick={() => setPrompt({ r, kind: 'rechazar' })}>Rechazar</button><EliminarBtn nombre={`reserva de ${r.zona}`} notify={notify} run={() => api.reservas.eliminar(r.id)} onDone={() => setItems(l => (l ?? []).filter(x => x.id !== r.id))} /></>}
            {r.estado === 'Aprobada' && <button onClick={() => finalizar(r)}>Finalizar</button>}
            {(r.estado === 'Pendiente' || r.estado === 'Aprobada') && <button className="danger" onClick={() => setPrompt({ r, kind: 'anular' })}>Anular</button>}
          </> : r.puedeCancelar && <button className="danger" onClick={() => setPrompt({ r, kind: 'cancelar' })}>Cancelar</button>}
        </div></td>
      </tr>)}
    </Table>}
    {prompt && <TextPrompt danger title={`${titles[prompt.kind]} reserva de ${prompt.r.zona}`} label="Motivo" submitLabel={`${titles[prompt.kind]} reserva`} description={descs[prompt.kind]} reasons={reasonsBy[prompt.kind]} onClose={() => setPrompt(null)}
      onSubmit={async motivo => {
        const { r, kind } = prompt
        const updated = await (kind === 'cancelar' ? api.reservas.cancelar(r.id, motivo) : kind === 'rechazar' ? api.reservas.rechazar(r.id, motivo) : api.reservas.anular(r.id, motivo))
        setItems(replaceIn(updated)); setPrompt(null); notify('Reserva actualizada')
      }} />}
    {approve && <FormModal title={`Aprobar reserva de ${approve.zona}`} submitLabel="Aprobar" onClose={() => setApprove(null)}
      description={<>{approve.solicitante} · {approve.inmueble} · {dia_fecha(approve.fecha)}, {hh(approve.horaInicio)}–{hh(approve.horaFin)} · {approve.numeroAsistentes} asistentes.
        {approve.motivo && <blockquote className="quote">{approve.motivo}</blockquote>}</>}
      onSubmit={async () => {
      setItems(replaceIn(await api.reservas.aprobar(approve.id, cond.trim() || undefined))); setApprove(null); notify('Reserva aprobada')
    }}>
      <label style={{ gridColumn: '1 / -1' }}>Condiciones de uso (opcional)<textarea value={cond} onChange={e => setCond(e.target.value)} /></label>
    </FormModal>}
  </>
}
