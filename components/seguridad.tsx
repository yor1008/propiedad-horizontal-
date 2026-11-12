'use client'

import { useEffect, useState } from 'react'
import { Check, Plus, Search } from 'lucide-react'
import {
  api, errorMessage,
  type DirectorioInmueble, type MiInmueble, type Notificacion, type Parqueadero, type PreRegistro,
  type RespuestaResidente, type TipoVigencia, type Visita,
} from '@/lib/api'
import { Badge, ErrorLine, Header, Loading, Placa, Unidad, useCatalog, useList } from './api-pages'
import { FormModal, Select, Table, fecha, replaceIn } from './modules'

type Notify = (message: string) => void

const visitaTone = (e: Visita['estado']) => (e === 'Dentro' ? 'green' : e === 'Negado' ? 'amber' : 'neutral')
const dia = (f: string | null) => (f ? new Date(`${f}T00:00:00`).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—')
const today = () => new Date().toLocaleDateString('en-CA') // yyyy-MM-dd en hora local

/* ───────────── Pre-registros (residente) ───────────── */

export function PreRegistrosPage({ notify }: { notify: Notify }) {
  const { items, setItems, error } = useList<PreRegistro>(api.preRegistros.mios, [])
  const [open, setOpen] = useState(false)

  async function cancelar(p: PreRegistro) {
    try { setItems(replaceIn(await api.preRegistros.cancelar(p.id))); notify('Pre-registro cancelado') } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="SEGURIDAD · VISITANTES" title="Preregistros">
      <button className="primary-btn" onClick={() => setOpen(true)}><Plus size={16} /> Nuevo preregistro</button>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Visitante', 'Documento', 'Vigencia', 'Vehículo', 'Estado', 'Acciones']} foot={`${items.length} preregistros`}>
      {items.map(p => <tr key={p.id}>
        <td>{p.visitante}{p.motivo && <><br /><small>{p.motivo}</small></>}</td><td>{p.numeroDocumento}</td>
        <td>{p.tipoVigencia === 'PERMANENTE' ? 'Permanente' : dia(p.fechaPrevista)}</td>
        <td>{p.placaVehiculo ? <><Placa value={p.placaVehiculo} />{p.tipoVehiculo && <small> {p.tipoVehiculo}</small>}</> : '—'}</td>
        <td><Badge tone={p.vigente ? 'green' : p.usado ? 'neutral' : 'amber'}>{!p.activo ? 'Cancelado' : p.usado ? 'Usado' : p.vigente ? 'Vigente' : 'Programado'}</Badge></td>
        <td>{p.activo && !p.usado && <div className="btn-group"><button className="danger" onClick={() => cancelar(p)}>Cancelar</button></div>}</td>
      </tr>)}
    </Table>}
    {open && <NuevoPreRegistro onClose={() => setOpen(false)} onCreated={p => { setItems(l => [p, ...(l ?? [])]); setOpen(false); notify('Pre-registro creado') }} />}
  </>
}

function NuevoPreRegistro({ onClose, onCreated }: { onClose: () => void; onCreated: (p: PreRegistro) => void }) {
  const vehiculos = useCatalog('TIPO_VEHICULO')
  const [f, setF] = useState({ nombreCompleto: '', numeroDocumento: '', tipoVigencia: 'FECHA_ESPECIFICA' as TipoVigencia, fechaPrevista: '', motivo: '', placaVehiculo: '', tipoVehiculoId: '' })
  return <FormModal title="Nuevo preregistro" submitLabel="Guardar" onClose={onClose} onSubmit={async () => onCreated(await api.preRegistros.crear({
    nombreCompleto: f.nombreCompleto, numeroDocumento: f.numeroDocumento, tipoVigencia: f.tipoVigencia,
    fechaPrevista: f.tipoVigencia === 'FECHA_ESPECIFICA' ? f.fechaPrevista : undefined, motivo: f.motivo || undefined,
    placaVehiculo: f.placaVehiculo || undefined, tipoVehiculoId: f.tipoVehiculoId ? +f.tipoVehiculoId : undefined,
  }))}>
    <label>Nombre completo<b>*</b><input required value={f.nombreCompleto} onChange={e => setF({ ...f, nombreCompleto: e.target.value })} /></label>
    <label>Documento<b>*</b><input required value={f.numeroDocumento} onChange={e => setF({ ...f, numeroDocumento: e.target.value })} /></label>
    <label>Vigencia<b>*</b><select value={f.tipoVigencia} onChange={e => setF({ ...f, tipoVigencia: e.target.value as TipoVigencia })}>
      <option value="FECHA_ESPECIFICA">Fecha específica (un ingreso)</option><option value="PERMANENTE">Permanente (hasta cancelarlo)</option></select></label>
    {f.tipoVigencia === 'FECHA_ESPECIFICA' && <label>Fecha prevista<b>*</b><input type="date" required min={today()} value={f.fechaPrevista} onChange={e => setF({ ...f, fechaPrevista: e.target.value })} /></label>}
    <label style={{ gridColumn: '1 / -1' }}>Motivo<input value={f.motivo} onChange={e => setF({ ...f, motivo: e.target.value })} /></label>
    <label>Placa del vehículo<input value={f.placaVehiculo} onChange={e => setF({ ...f, placaVehiculo: e.target.value.toUpperCase() })} /></label>
    <Select label="Tipo de vehículo" required={false} value={f.tipoVehiculoId} onChange={v => setF({ ...f, tipoVehiculoId: v })}>
      {vehiculos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Select>
  </FormModal>
}

/* ───────────── Autorizar ingreso (vigilante, con pre-registro) ───────────── */

export function AutorizarIngresoPage({ notify }: { notify: Notify }) {
  const [doc, setDoc] = useState('')
  const [results, setResults] = useState<PreRegistro[] | null>(null)
  const [last, setLast] = useState<Visita | null>(null)
  const [error, setError] = useState('')

  async function buscar(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLast(null); setResults(null)
    try { setResults(await api.accesos.preRegistros(doc.trim())) } catch (err) { setError(errorMessage(err)); setResults([]) }
  }
  async function autorizar(p: PreRegistro) {
    setError('')
    try { setLast(await api.accesos.conPreRegistro(p.id)); setResults(null); setDoc(''); notify('Ingreso autorizado') } catch (err) { setError(errorMessage(err)) }
  }

  return <>
    <Header kicker="SEGURIDAD · ACCESO" title="Autorizar ingreso" />
    <form onSubmit={buscar} className="table-toolbar" style={{ marginBottom: 12 }}>
      <div className="search-field"><Search size={16} /><input required value={doc} onChange={e => setDoc(e.target.value)} placeholder="Documento del visitante" /></div>
      <button className="primary-btn">Buscar preregistro</button>
    </form>
    <ErrorLine message={error} />
    {last && <div className="panel result-note" style={{ marginBottom: 12 }}>
      <b>{last.visitante}</b> ingresó a <b>{last.inmueble}</b> · {fecha(last.fechaHoraEntrada)} <Badge tone="green">{last.estado}</Badge>
    </div>}
    {results !== null && (results.length === 0
      ? <div className="empty-panel"><p>No hay preregistros vigentes hoy para ese documento. Puedes usar «Ingreso sin preregistro».</p></div>
      : <Table head={['Visitante', 'Residente', 'Inmueble', 'Vigencia', 'Vehículo', 'Acciones']} foot={`${results.length} preregistros`}>
        {results.map(p => <tr key={p.id}>
          <td>{p.visitante}</td><td>{p.residente}</td><td>{p.inmueble}</td>
          <td>{p.tipoVigencia === 'PERMANENTE' ? 'Permanente' : dia(p.fechaPrevista)}</td><td>{p.placaVehiculo ? <Placa value={p.placaVehiculo} /> : '—'}</td>
          <td><div className="btn-group"><button onClick={() => autorizar(p)}>Autorizar ingreso</button></div></td>
        </tr>)}
      </Table>)}
  </>
}

/* ───────────── Ingreso sin preregistro (vigilante) ───────────── */

const RESPUESTAS: { value: RespuestaResidente; label: string }[] = [
  { value: 'APRUEBA', label: 'El residente aprueba' },
  { value: 'NO_APRUEBA', label: 'El residente no aprueba' },
  { value: 'NO_CONTESTA', label: 'El residente no contesta' },
]

export function IngresoSinPreregistroPage({ notify }: { notify: Notify }) {
  const directorio = useList<DirectorioInmueble>(api.accesos.inmuebles, [])
  const vehiculos = useCatalog('TIPO_VEHICULO')
  const empty = { nombreCompleto: '', numeroDocumento: '', inmuebleId: '', residenteContactadoId: '', respuestaResidente: 'APRUEBA' as RespuestaResidente, motivoNegacion: '', tipoVehiculoId: '' }
  const [f, setF] = useState(empty)
  const [last, setLast] = useState<Visita | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inmueble = (directorio.items ?? []).find(i => String(i.id) === f.inmuebleId)

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const v = await api.accesos.sinPreRegistro({
        nombreCompleto: f.nombreCompleto, numeroDocumento: f.numeroDocumento, inmuebleId: +f.inmuebleId, residenteContactadoId: +f.residenteContactadoId,
        respuestaResidente: f.respuestaResidente, motivoNegacion: f.respuestaResidente !== 'APRUEBA' && f.motivoNegacion ? f.motivoNegacion : undefined,
        tipoVehiculoId: f.tipoVehiculoId ? +f.tipoVehiculoId : undefined,
      })
      setLast(v); setF(empty)
      notify(v.estado === 'Negado' ? 'Ingreso negado; quedó en el historial' : 'Ingreso autorizado')
    } catch (err) { setError(errorMessage(err)) }
    setBusy(false)
  }

  return <>
    <Header kicker="SEGURIDAD · ACCESO" title="Ingreso sin preregistro" />
    <ErrorLine message={directorio.error} />
    {last && <div className="panel result-note" style={{ marginBottom: 12 }}>
      <b>{last.visitante}</b> → <b>{last.inmueble}</b> <Badge tone={visitaTone(last.estado)}>{last.estado}</Badge>{last.motivoNegacion && <small> · {last.motivoNegacion}</small>}
    </div>}
    <form className="form-card" onSubmit={submit}>
      <div className="fields-grid">
        <label>Nombre del visitante<b>*</b><input required value={f.nombreCompleto} onChange={e => setF({ ...f, nombreCompleto: e.target.value })} /></label>
        <label>Documento<b>*</b><input required value={f.numeroDocumento} onChange={e => setF({ ...f, numeroDocumento: e.target.value })} /></label>
        <Select label="Inmueble a visitar" value={f.inmuebleId} onChange={v => setF({ ...f, inmuebleId: v, residenteContactadoId: '' })}>
          {(directorio.items ?? []).map(i => <option key={i.id} value={i.id}>{i.torreBloque}-{i.numero}</option>)}</Select>
        <Select label="Residente contactado" value={f.residenteContactadoId} onChange={v => setF({ ...f, residenteContactadoId: v })}>
          {(inmueble?.residentes ?? []).map(r => <option key={r.id} value={r.id}>{r.nombre}{r.telefono ? ` · ${r.telefono}` : ''}</option>)}</Select>
        <label>Respuesta del residente<b>*</b><select value={f.respuestaResidente} onChange={e => setF({ ...f, respuestaResidente: e.target.value as RespuestaResidente })}>
          {RESPUESTAS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label>
        <Select label="Tipo de vehículo" required={false} value={f.tipoVehiculoId} onChange={v => setF({ ...f, tipoVehiculoId: v })}>
          {vehiculos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</Select>
        {f.respuestaResidente !== 'APRUEBA' && <label style={{ gridColumn: '1 / -1' }}>Motivo de la negación (opcional)<input value={f.motivoNegacion} onChange={e => setF({ ...f, motivoNegacion: e.target.value })} /></label>}
      </div>
      <ErrorLine message={error} />
      <div className="form-actions"><button className="primary-btn" disabled={busy}><Check size={16} /> Registrar</button></div>
    </form>
  </>
}

/* ───────────── Visitantes dentro: ver, asignar parqueadero, registrar salida ───────────── */

export function AccesosDentroPage({ notify, mode }: { notify: Notify; mode: 'ver' | 'parqueadero' | 'salida' }) {
  const { items, setItems, error } = useList<Visita>(api.accesos.dentro, [])
  const libres = useList<Parqueadero>(mode === 'parqueadero' ? api.accesos.parqueaderosDisponibles : async () => [], [mode])
  const [pick, setPick] = useState<Record<number, string>>({})
  const [rowError, setRowError] = useState('')
  const title = mode === 'salida' ? 'Registrar salida' : mode === 'parqueadero' ? 'Parqueadero visitante' : 'Visitantes dentro'

  async function asignar(v: Visita) {
    setRowError('')
    try { setItems(replaceIn(await api.accesos.asignarParqueadero(v.id, +pick[v.id]))); libres.reload(); notify('Parqueadero asignado') } catch (e) { setRowError(errorMessage(e)) }
  }
  async function salida(v: Visita) {
    setRowError('')
    try { await api.accesos.salida(v.id); setItems(l => (l ?? []).filter(x => x.id !== v.id)); libres.reload(); notify(`Salida registrada: ${v.visitante}`) } catch (e) { setRowError(errorMessage(e)) }
  }

  return <>
    <Header kicker="SEGURIDAD · ACCESO" title={title} />
    <ErrorLine message={error || libres.error || rowError} />
    {items === null ? <Loading /> : !items.length ? <div className="empty-panel"><p>No hay visitantes dentro en este momento.</p></div>
      : <Table head={['Visitante', 'Documento', 'Inmueble', 'Entrada', 'Vehículo', 'Parqueadero', ...(mode !== 'ver' ? ['Acciones'] : [])]} foot={`${items.length} visitantes dentro`}>
        {items.map(v => <tr key={v.id}>
          <td>{v.visitante}</td><td>{v.numeroDocumento}</td><td>{v.inmueble}</td><td>{fecha(v.fechaHoraEntrada)}</td><td>{v.tipoVehiculo ?? '—'}</td><td>{v.parqueadero ?? '—'}</td>
          {mode === 'salida' && <td><div className="btn-group"><button onClick={() => salida(v)}>Registrar salida</button></div></td>}
          {mode === 'parqueadero' && <td>{v.parqueadero ? '—' : <>
            <select value={pick[v.id] ?? ''} onChange={e => setPick({ ...pick, [v.id]: e.target.value })} aria-label="Parqueadero">
              <option value="">Parqueadero…</option>{(libres.items ?? []).map(p => <option key={p.id} value={p.id}>{p.torreBloque}-{p.numero}</option>)}</select>{' '}
            <span className="btn-group"><button disabled={!pick[v.id]} onClick={() => asignar(v)}>Asignar</button></span></>}</td>}
        </tr>)}
      </Table>}
  </>
}

/* ───────────── Historial de accesos (administrador y vigilante) ───────────── */

export function HistorialPage() {
  const [f, setF] = useState({ desde: '', hasta: '', documento: '' })
  const [items, setItems] = useState<Visita[] | null>(null)
  const [error, setError] = useState('')

  function load(filters = f) {
    setError(''); setItems(null)
    api.accesos.historial({ desde: filters.desde, hasta: filters.hasta, documento: filters.documento.trim() })
      .then(setItems).catch(e => { setItems([]); setError(errorMessage(e)) })
  }
  useEffect(() => load(), []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>
    <Header kicker="SEGURIDAD · REGISTRO" title="Historial de accesos" />
    <form className="table-toolbar" style={{ marginBottom: 12, flexWrap: 'wrap' }} onSubmit={e => { e.preventDefault(); load() }}>
      <label>Desde <input type="date" value={f.desde} onChange={e => setF({ ...f, desde: e.target.value })} /></label>
      <label>Hasta <input type="date" value={f.hasta} onChange={e => setF({ ...f, hasta: e.target.value })} /></label>
      <div className="search-field"><Search size={16} /><input value={f.documento} onChange={e => setF({ ...f, documento: e.target.value })} placeholder="Documento" /></div>
      <button className="primary-btn">Filtrar</button>
      <button type="button" className="secondary-btn" onClick={() => { const e = { desde: '', hasta: '', documento: '' }; setF(e); load(e) }}>Limpiar</button>
    </form>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : <Table head={['Visitante', 'Documento', 'Inmueble', 'Llegada', 'Salida', 'Tipo', 'Estado']} foot={`${items.length} registros (máximo los 500 más recientes)`}>
      {items.map(v => <tr key={v.id}>
        <td>{v.visitante}</td><td>{v.numeroDocumento}</td><td>{v.inmueble}</td><td>{fecha(v.fechaHoraLlegada)}</td><td>{fecha(v.fechaHoraSalida)}</td>
        <td>{v.conPreRegistro ? 'Con preregistro' : 'Sin preregistro'}</td>
        <td><Badge tone={visitaTone(v.estado)}>{v.estado}</Badge>{v.motivoNegacion && <small> · {v.motivoNegacion}</small>}</td>
      </tr>)}
    </Table>}
  </>
}

/* ───────────── Notificaciones (persona vinculada) ───────────── */

export function NotificacionesPage({ notify, onUnread }: { notify: Notify; onUnread: (n: number) => void }) {
  const [soloNoLeidas, setSolo] = useState(false)
  const { items, setItems, error } = useList<Notificacion>(() => api.notificaciones.mias(soloNoLeidas), [soloNoLeidas])

  const refreshCount = () => api.notificaciones.conteo().then(c => onUnread(c.noLeidas)).catch(() => {})

  async function leer(n: Notificacion) {
    try { setItems(replaceIn(await api.notificaciones.leer(n.id))); refreshCount() } catch (e) { notify(errorMessage(e)) }
  }
  async function leerTodas() {
    try {
      const { noLeidas } = await api.notificaciones.leerTodas()
      onUnread(noLeidas); setItems(l => (soloNoLeidas ? [] : (l ?? []).map(n => ({ ...n, leida: true })))); notify('Notificaciones marcadas como leídas')
    } catch (e) { notify(errorMessage(e)) }
  }

  return <>
    <Header kicker="TRANSVERSAL · SEGUIMIENTO" title="Notificaciones">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label className="check"><input type="checkbox" checked={soloNoLeidas} onChange={e => setSolo(e.target.checked)} /> Solo no leídas</label>
        <button className="secondary-btn" onClick={leerTodas}><Check size={16} /> Marcar todas como leídas</button>
      </div>
    </Header>
    <ErrorLine message={error} />
    {items === null ? <Loading /> : !items.length ? <div className="empty-panel"><p>No tienes notificaciones.</p></div>
      : <div className="panel notification-list">{items.map(n => <div className="notification-row" key={n.id} style={{ opacity: n.leida ? 0.65 : 1 }}>
        <span className={`activity-dot ${n.leida ? 'gray' : 'blue'}`} />
        <div><strong>{n.mensaje}</strong><small>{fecha(n.fechaHora)}</small></div>
        {!n.leida && <button className="row-action" onClick={() => leer(n)}>Marcar leída</button>}
      </div>)}</div>}
  </>
}

/* ───────────── Mi inmueble (propietario) ───────────── */

export function MiInmueblePage() {
  const { items, error } = useList<MiInmueble>(api.misInmuebles, [])
  return <>
    <Header kicker="ADMINISTRACIÓN · PROPIEDAD" title="Mi inmueble" />
    <ErrorLine message={error} />
    {items === null ? <Loading /> : !items.length ? <div className="empty-panel"><p>No tienes un inmueble como propietario con vínculo vigente.</p></div>
      : items.map(i => <div className="panel" key={i.id} style={{ marginBottom: 12 }}>
        <h3 className="result-head"><Unidad value={`${i.torreBloque}-${i.numero}`} /> <Badge tone={!i.activo ? 'amber' : i.ocupado ? 'green' : 'neutral'}>{!i.activo ? 'Inactivo' : i.ocupado ? 'Ocupado' : 'Disponible'}</Badge></h3>
        <dl className="kv">
          <div><dt>Tipo</dt><dd>{i.tipo}</dd></div><div><dt>Piso</dt><dd>{i.piso}</dd></div>
          <div><dt>Parqueaderos</dt><dd>{i.parqueaderos.length ? i.parqueaderos.map(p => `${p.torreBloque}-${p.numero}`).join(', ') : 'Ninguno asignado'}</dd></div>
        </dl>
      </div>)}
  </>
}
