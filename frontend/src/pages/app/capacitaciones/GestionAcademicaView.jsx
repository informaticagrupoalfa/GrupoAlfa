import { useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import { apiClient } from "../../../services/apiClient"
import ParallelSetupFields from "../../../components/features/capacitaciones/ParallelSetupFields"
import FacultyCareersSection from "./FacultyCareersSection"
import ScheduleMatrix from "../../../components/dashboard/ScheduleMatrix"
import { formatConvocatoriaOption } from "../../../utils/convocatoriaOption"
import { parseWeekdays } from "../../../utils/weekdays"
import "./GestionAcademicaView.css"

const STEPS = [
  { key: "facultades", label: "Facultades", icon: "building", color: "violet", endpoint: "facultades", pk: "id_facultad", title: "nombre", fields: [{ name: "nombre", label: "Nombre", type: "text", required: true }] },
  { key: "convocatorias", label: "Convocatorias", icon: "calendar", color: "blue", endpoint: "convocatorias", pk: "id_convocatoria", title: "nombre_facultad", fields: [{ name: "id_facultad", label: "Facultad", type: "select", source: "facultades", id: "id_facultad", text: "nombre", required: true }, { name: "fecha_inicio", label: "Inicio", type: "date", required: true }, { name: "modalidad", label: "Modalidad", type: "text", maxLength: 100 }, { name: "vigencia", label: "Vigente", type: "checkbox" }] },
  { key: "capacitaciones", label: "Capacitaciones", icon: "cap", color: "cyan", endpoint: "capacitaciones", pk: "id_capacitacion", title: "id_capacitacion", fields: [{ name: "id_convocatoria", label: "Convocatoria", type: "select", source: "convocatorias", id: "id_convocatoria", text: "nombre_facultad", optionLabel: formatConvocatoriaOption, required: true }, { name: "fecha_inicio", label: "Inicio", type: "date", required: true }, { name: "fecha_fin", label: "Fin", type: "date" }, { name: "precio", label: "Precio", type: "number", min: "0", step: "0.01", required: true }, { name: "activo", label: "Activa", type: "checkbox" }] },
  { key: "materias", label: "Materias", icon: "book", color: "amber", endpoint: "materias", pk: "id_materia", title: "nombre_materia", fields: [{ name: "nombre_materia", label: "Nombre de la materia", type: "text", required: true }] },
  { key: "aulas", label: "Aulas", icon: "door", color: "green", endpoint: "aulas", pk: "id_aula", title: "codigo", fields: [{ name: "codigo", label: "Código", type: "text", required: true }, { name: "capacidad", label: "Capacidad", type: "number", required: true }] },
  { key: "paralelos", label: "Paralelos y docentes", icon: "group", color: "rose", endpoint: "paralelos", pk: "id_paralelo", title: "nombre_paralelo", fields: [{ name: "id_capacitacion", label: "Capacitación", type: "select", source: "capacitaciones", id: "id_capacitacion", text: "id_capacitacion", required: true }, { name: "id_aula", label: "Aula", type: "select", source: "aulas", id: "id_aula", text: "codigo", required: true }, { name: "nombre_paralelo", label: "Nombre", type: "text", required: true }, { name: "nivel", label: "Nivel", type: "text" }, { name: "modalidad", label: "Modalidad", type: "text" }, { name: "hora_inicio", label: "Hora de inicio", type: "time" }, { name: "hora_fin", label: "Hora de fin", type: "time" }] },
]

function Icon({ name }) {
  const paths = {
    building: <><path d="M3 21h18M5 21V6l7-3 7 3v15M9 9h.01M15 9h.01M9 13h.01M15 13h.01M10 21v-4h4v4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h7"/></>,
    cap: <><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3 3 9 3 12 0v-5M22 9v6"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5z"/><path d="M4 17a3 3 0 0 1 3-3h13M9 7h6"/></>,
    door: <><path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18M14 12h.01"/></>,
    group: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 4v2"/></>,
  }
  return <svg className="flow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}
Icon.propTypes = { name: PropTypes.string.isRequired }

const initialData = { facultades: [], carreras: [], convocatorias: [], capacitaciones: [], materias: [], aulas: [], materiasCapacitacion: [], paralelos: [] }

async function loadAllCareers() {
  const items = []
  for (let offset = 0; ; offset += 100) {
    const { data } = await apiClient.get("/carreras", { params: { limit: 100, offset } })
    items.push(...data)
    if (data.length < 100) return items
  }
}
export default function GestionAcademicaView() {
  const [data, setData] = useState(initialData)
  const [step, setStep] = useState("facultades")
  const [record, setRecord] = useState(null)
  const [form, setForm] = useState({})
  const [selectedMaterias, setSelectedMaterias] = useState([])
  const [search, setSearch] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const current = STEPS.find(item => item.key === step)

  const reload = async () => {
    const endpoints = ["facultades", "convocatorias", "capacitaciones", "materias", "aulas", "materias-capacitacion", "configuracion-paralelos"]
    const [values, carreras] = await Promise.all([Promise.all(endpoints.map(path => apiClient.get(`/${path}`).then(r => r.data))), loadAllCareers()])
    setData({ facultades: values[0], carreras, convocatorias: values[1], capacitaciones: values[2], materias: values[3], aulas: values[4], materiasCapacitacion: values[5], paralelos: values[6] })
  }
  useEffect(() => { reload().catch(e => setMessage(e.userMessage || "No se pudieron cargar los datos.")) }, [])
  const rows = useMemo(() => (data[step] || []).filter(row => JSON.stringify(row).toLowerCase().includes(search.toLowerCase())), [data, step, search])
  const scheduleParalelos = useMemo(() => data.paralelos.map(p => ({ ...p, ocupados: Number(p.ocupados ?? p.total_estudiantes) || 0 })), [data.paralelos])
  const startNew = () => { setRecord(null); setForm(step === "paralelos" ? { activo: true } : step === "convocatorias" ? { vigencia: true } : {}); setSelectedMaterias([]); setMessage("") }
  const select = async row => {
    setRecord(row); setMessage("")
    const next = Object.fromEntries(current.fields.map(f => [f.name, row[f.name] ?? (f.type === "checkbox" ? false : "")]))
    setForm(step === "paralelos" ? { ...next, dias: row.dias ?? "" } : next); setSelectedMaterias([])
    if (step === "capacitaciones") {
      const links = data.materiasCapacitacion.filter(x => Number(x.id_capacitacion) === Number(row.id_capacitacion))
      setSelectedMaterias(links.map(x => Number(x.id_materia)))
    }
    if (step === "paralelos") {
      const assigned = (row.asignaciones || []).filter(x => x.id_materia != null)
      setSelectedMaterias(assigned.map(x => Number(x.id_materia)))
    }
  }
  const save = async e => {
    e.preventDefault(); setBusy(true); setMessage("")
    try {
      if (step === "paralelos") {
        if (!selectedMaterias.length) throw new Error("Selecciona al menos una materia.")
        if (!parseWeekdays(form.dias).length) throw new Error("Selecciona al menos un día de clase.")
        if (form.hora_inicio && form.hora_fin && form.hora_fin <= form.hora_inicio) throw new Error("La hora final debe ser posterior a la inicial.")
        const payload = { ...form, id_capacitacion: Number(form.id_capacitacion), id_aula: Number(form.id_aula), materias: selectedMaterias.map(id_materia => ({ id_materia })) }
        if (record) {
          await apiClient.put(`/configuracion-paralelos/${record.id_paralelo}`, payload)
        } else {
          await apiClient.post("/configuracion-paralelos", payload)
        }
      } else {
        const payload = { ...form }
        current.fields.filter(f => f.type === "select" || f.type === "number").forEach(f => { if (payload[f.name] !== "" && payload[f.name] != null) payload[f.name] = Number(payload[f.name]) })
        const saved = record ? (await apiClient.put(`/${current.endpoint}/${record[current.pk]}`, payload)).data : (await apiClient.post(`/${current.endpoint}`, payload)).data
        if (step === "facultades") {
          await reload()
          setRecord(saved)
          setForm({ nombre: saved.nombre })
          setMessage("Facultad guardada. Ya puedes agregar o asignar carreras.")
          return
        }
        if (step === "capacitaciones") {
          const capId = saved.id_capacitacion ?? record?.id_capacitacion
          const old = data.materiasCapacitacion.filter(x => Number(x.id_capacitacion) === Number(capId))
          for (const link of old) if (!selectedMaterias.includes(Number(link.id_materia))) await apiClient.delete(`/materias-capacitacion/${link.id_asignacion_materia}`)
          for (const id_materia of selectedMaterias) if (!old.some(x => Number(x.id_materia) === id_materia)) await apiClient.post("/materias-capacitacion", { id_capacitacion: capId, id_materia })
        }
      }
      await reload(); startNew(); setMessage("Guardado correctamente.")
    } catch (e) { setMessage(e.userMessage || e.message || "No se pudo guardar.") } finally { setBusy(false) }
  }
  const remove = async row => { if (!window.confirm("¿Eliminar este registro?")) return; try { await apiClient.delete(`/${current.endpoint}/${row[current.pk]}`); if (record?.[current.pk] === row[current.pk]) startNew(); await reload() } catch (e) { setMessage(e.userMessage || "No se pudo eliminar.") } }
  return <main className="setup-page">
    <header className="setup-head"><div><span className="setup-kicker">CONFIGURACIÓN ACADÉMICA</span><h1>Preparar un paralelo</h1><p>Completa los catálogos, define los días del paralelo y asigna un asesor en cada día.</p></div><div className="setup-progress">{STEPS.map((s,i)=><span className={step===s.key?"active":""} key={s.key}>{i+1}</span>)}</div></header>
    <nav className="setup-steps">{STEPS.map((s,i)=><button key={s.key} className={step===s.key?"active":""} onClick={()=>{setStep(s.key);setRecord(null);setForm({});setSearch("")}}><span>{i+1}</span><Icon name={s.icon}/>{s.label}</button>)}</nav>
    <div className="setup-columns"><section className={`setup-editor tone-${current.color}`}><div className="editor-title"><span className="editor-icon"><Icon name={current.icon}/></span><div><small>{record?"EDITAR REGISTRO":"PASO DE CONFIGURACIÓN"}</small><h2>{record?`Editar ${current.label.slice(0,-1)}`:`Nuevo ${current.label.slice(0,-1)}`}</h2></div></div>
      <form onSubmit={save} className="setup-form">{current.fields.map(f=><label key={f.name} className={f.type==="checkbox"?"check-field":undefined}>{f.label}{f.type==="select"?<select required={f.required} value={form[f.name]??""} onChange={e=>{ if (step === "paralelos" && f.name === "id_capacitacion") setSelectedMaterias([]); setForm(v=>({...v,[f.name]:e.target.value})) }}><option value="">Selecciona…</option>{data[f.source].map(o=><option key={o[f.id]} value={o[f.id]}>{f.optionLabel?.(o) ?? o[f.text] ?? `${f.label} ${o[f.id]}`}</option>)}</select>:f.type==="checkbox"?<span className="checkline"><input type="checkbox" checked={Boolean(form[f.name])} onChange={e=>setForm(v=>({...v,[f.name]:e.target.checked}))}/><span>{form[f.name]?"Sí":"No"}</span></span>:<input type={f.type} required={f.required} maxLength={f.maxLength} min={f.min} step={f.step} value={form[f.name]??""} onChange={e=>{ if (step === "paralelos" && f.name === "id_capacitacion") setSelectedMaterias([]); setForm(v=>({...v,[f.name]:e.target.value})) }}/>}</label>)}
      {step==="capacitaciones"&&<fieldset className="choice-box"><legend>Materias de la capacitación <span className="choice-count">{selectedMaterias.length}/{data.materias.length}</span></legend><p>Selecciona las materias que podrán ofrecerse en sus paralelos.</p>{data.materias.length===0?<p className="choice-empty">Todavía no hay materias registradas. Créalas en el paso «Materias».</p>:<div className="choice-list">{data.materias.map(m=><label className="choice-row" key={m.id_materia}><input type="checkbox" checked={selectedMaterias.includes(m.id_materia)} onChange={e=>setSelectedMaterias(prev=>e.target.checked?[...prev,m.id_materia]:prev.filter(id=>id!==m.id_materia))}/><span>{m.nombre_materia}</span></label>)}</div>}</fieldset>}
      {step === "paralelos" && <ParallelSetupFields
        capacitacionId={form.id_capacitacion}
        links={data.materiasCapacitacion}
        materias={data.materias}
        selectedMaterias={selectedMaterias}
        dias={form.dias ?? ""}
        onSubjectsChange={setSelectedMaterias}
        onDaysChange={dias => setForm(current => ({ ...current, dias }))}
      />}

      <div className="setup-actions"><button className="subtle" type="button" onClick={startNew}>Limpiar</button><button type="submit" disabled={busy}>{busy?"Guardando…":record?"Guardar cambios":"Crear registro"}</button></div></form>{message&&<p className="setup-message" role="status">{message}</p>}
      {step === "facultades" && <FacultyCareersSection faculty={record} careers={data.carreras} faculties={data.facultades} onChanged={reload} />}
      <p className="editor-tip">{step==="paralelos"?"Al crear, se guardan el paralelo y sus materias. Después asigna un asesor para cada día de clase.":"Los registros relacionados aparecerán disponibles en los siguientes pasos."}</p>
    </section><section className="setup-list"><div className="list-heading"><div><span className={`list-icon tone-${current.color}`}><Icon name={current.icon}/></span><div><h2>{current.label}</h2><p>{rows.length} registros</p></div></div><input type="search" placeholder={`Buscar ${current.label.toLowerCase()}…`} value={search} onChange={e=>setSearch(e.target.value)}/></div><div className="setup-cards">{rows.map(row=>{const id=row[current.pk];return <article key={id} className={`setup-card tone-${current.color} ${record?.[current.pk]===id?"selected":""}`}><button className="card-select" onClick={()=>select(row)}><span className="card-icon"><Icon name={current.icon}/></span><strong>{row[current.title]||`${current.label.slice(0,-1)} ${id}`}</strong><small>Registro #{id}</small>{step==="capacitaciones"&&<span className="card-meta">Precio: {row.precio ?? "—"}</span>}{step==="convocatorias"&&row.modalidad&&<span className="card-meta">Modalidad: {row.modalidad}</span>}{step==="convocatorias"&&<span className="card-meta">Vigencia: {row.vigencia?"Sí":"No"}</span>}{step==="paralelos"&&<span className="card-meta">{row.aula_codigo||"Aula pendiente"} · {row.hora_inicio||"Horario pendiente"}{row.asignaciones?.filter(a=>a.id_materia).length?` · ${row.asignaciones.filter(a=>a.id_materia).length} materia(s)`:""}</span>}</button><div className="card-actions"><button onClick={()=>select(row)}>Editar</button><button onClick={()=>remove(row)}>Eliminar</button></div></article>})}{rows.length===0&&<div className="no-records">Todavía no hay {current.label.toLowerCase()}. Usa el formulario para crear el primer registro.</div>}</div></section></div>
    <ScheduleMatrix aulas={data.aulas} paralelos={scheduleParalelos} />
  </main>
}
