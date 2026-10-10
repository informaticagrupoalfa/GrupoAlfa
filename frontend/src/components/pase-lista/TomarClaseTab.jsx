import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import Skeleton from "../ui/Skeleton"
import Button from "../ui/Button"
import TextField from "../ui/TextField"
import { createResource, listResource } from "../../services/academicService"
import { guardarListaEnBD, loadEstudiantesPorCurso } from "../../services/paseListaService"
import "./TomarClase.css"

// split-dynamic-imports: la tabla solo se carga cuando hay curso seleccionado.
const PaseListaTable = lazy(() => import("./PaseListaTable.jsx"))
const PersonCombobox = lazy(() => import("../features/matriculaciones/PersonCombobox.jsx"))

const initialForm = {
  idMateria: "",
  idAsesor: "",
  horaInicio: "",
  horaFin: "",
  idCurso: "",
  idAula: "",
  fecha: new Date().toISOString().slice(0, 10),
  idTema: "",
}

function userName(u) {
  if (!u) return ""
  const full = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ")
  return full || u.nombre_completo || u.correo_electronico || `Usuario ${u.id_usuario ?? u.nro_carnet ?? ""}`
}

export default function TomarClaseTab({ catalogs, onSaved }) {
  const [form, setForm] = useState(initialForm)
  const [alumnos, setAlumnos] = useState([])
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [alumnosNota, setAlumnosNota] = useState("")
  const [asistencia, setAsistencia] = useState({})
  const [guardado, setGuardado] = useState("")
  const [saving, setSaving] = useState(false)
  const [temasLocal, setTemasLocal] = useState(catalogs.temas ?? [])
  const [showNuevoTema, setShowNuevoTema] = useState(false)
  const [nuevoTemaNombre, setNuevoTemaNombre] = useState("")
  const [savingTema, setSavingTema] = useState(false)

  useEffect(() => {
    setTemasLocal(catalogs.temas ?? [])
  }, [catalogs.temas])

  const usuariosById = useMemo(() => {
    const map = new Map()
    for (const u of catalogs.usuarios ?? []) {
      map.set(String(u.id_usuario ?? u.nro_carnet), u)
    }
    return map
  }, [catalogs.usuarios])

  const nombreEstudiante = (est) =>
    est.nombre_completo ??
    userName(usuariosById.get(String(est.id_usuario))) ??
    `Estudiante ${est.id_estudiante}`

  const materiaOptions = useMemo(
    () => (catalogs.materias ?? []).map((m) => ({ value: m.id_materia, label: m.nombre_materia })),
    [catalogs.materias],
  )
  const asesorOptions = useMemo(
    () =>
      (catalogs.asesores ?? []).map((a) => ({
        value: a.id_asesor,
        label: a.nombre_completo ?? userName(usuariosById.get(String(a.id_usuario))) ?? `Asesor ${a.id_asesor}`,
      })),
    [catalogs.asesores, usuariosById],
  )
  const cursoOptions = useMemo(
    () =>
      (catalogs.capacitaciones ?? []).map((c) => ({
        value: c.id_capacitacion,
        label: `${c.nombre}${c.nivel ? ` (${c.nivel})` : ""}`,
      })),
    [catalogs.capacitaciones],
  )
  const aulaOptions = useMemo(
    () =>
      (catalogs.aulas ?? []).map((a) => ({
        value: a.id_aula,
        label: `Aula ${a.id_aula} — cap. ${a.capacidad ?? "—"}`,
      })),
    [catalogs.aulas],
  )
  const temaOptions = useMemo(
    () => (temasLocal ?? []).map((t) => ({ value: t.id_tema, label: t.nombre_tema })),
    [temasLocal],
  )
  const temaSeleccionado = useMemo(
    () => (temasLocal ?? []).find((t) => String(t.id_tema) === String(form.idTema)),
    [temasLocal, form.idTema],
  )

  const cursoSeleccionado = useMemo(
    () => (catalogs.capacitaciones ?? []).find((c) => String(c.id_capacitacion) === String(form.idCurso)),
    [catalogs.capacitaciones, form.idCurso],
  )

  // Al elegir curso: autocompleta aula/horario y carga la lista de abajo.
  useEffect(() => {
    let mounted = true
    async function loadAlumnos() {
      if (!form.idCurso) {
        setAlumnos([])
        setAlumnosNota("")
        setAsistencia({})
        return
      }
      setLoadingAlumnos(true)
      setGuardado("")
      try {
        if (cursoSeleccionado) {
          setForm((prev) => ({
            ...prev,
            idAula: prev.idAula || (cursoSeleccionado.id_aula != null ? String(cursoSeleccionado.id_aula) : ""),
            horaInicio: prev.horaInicio || String(cursoSeleccionado.hora_inicio ?? "").slice(0, 5),
            horaFin: prev.horaFin || String(cursoSeleccionado.hora_fin ?? "").slice(0, 5),
          }))
        }
        const matriculas = await loadEstudiantesPorCurso(form.idCurso)
        let lista = []
        let nota = ""
        if (Array.isArray(matriculas) && matriculas.length > 0) {
          const ids = new Set(matriculas.map((m) => String(m.id_estudiante ?? m.estudiante ?? "")))
          lista = (catalogs.estudiantes ?? []).filter((e) => ids.has(String(e.id_estudiante)))
          if (lista.length === 0) lista = matriculas
        } else {
          const todos = await listResource("estudiantes").catch(() => catalogs.estudiantes ?? [])
          lista = Array.isArray(todos) ? todos : []
          nota = "El backend aún no expone matriculaciones por curso; se muestran todos los estudiantes registrados."
        }
        if (mounted) {
          setAlumnos(lista)
          setAlumnosNota(nota)
          setAsistencia({})
        }
      } catch {
        if (mounted) {
          setAlumnos([])
          setAlumnosNota("No se pudo cargar la lista de estudiantes.")
        }
      } finally {
        if (mounted) setLoadingAlumnos(false)
      }
    }
    loadAlumnos()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.idCurso])

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value == null ? "" : String(value) }))
    setGuardado("")
  }

  const toggleAsistencia = (idEstudiante, presente) => {
    setAsistencia((prev) => ({ ...prev, [idEstudiante]: presente }))
    setGuardado("")
  }

  const marcarTodos = (presente) => {
    setAsistencia(Object.fromEntries(alumnos.map((a) => [a.id_estudiante ?? a.id, presente])))
    setGuardado("")
  }

  const resumen = useMemo(() => {
    const values = Object.values(asistencia)
    return {
      presentes: values.filter(Boolean).length,
      ausentes: values.filter((v) => v === false).length,
      sinMarcar: alumnos.length - values.length,
    }
  }, [asistencia, alumnos.length])

  const handleCrearTema = async () => {
    const nombre = nuevoTemaNombre.trim()
    if (!nombre) {
      setGuardado("Escribe el nombre del tema nuevo antes de adicionarlo.")
      return
    }
    if (!form.idMateria) {
      setGuardado("Elige primero la materia para adicionar el tema.")
      return
    }
    setSavingTema(true)
    try {
      const creado = await createResource("temas", {
        nombre_tema: nombre,
        id_materia: Number(form.idMateria),
      })
      const lista = await listResource("temas").catch(() => null)
      if (Array.isArray(lista)) {
        setTemasLocal(lista)
      } else if (creado?.id_tema != null) {
        setTemasLocal((prev) => [...prev, creado])
      }
      const nuevoId = creado?.id_tema != null ? String(creado.id_tema) : null
      if (nuevoId) setField("idTema", nuevoId)
      setNuevoTemaNombre("")
      setShowNuevoTema(false)
      setGuardado(`Tema "${nombre}" adicionado. Ya puedes guardar la lista.`)
    } catch {
      setGuardado("No se pudo adicionar el tema.")
    } finally {
      setSavingTema(false)
    }
  }

  const handleGuardar = async () => {
    if (saving) return
    if (!form.idMateria || !form.idAsesor || !form.idCurso || !form.idAula || !form.idTema) {
      setGuardado("Elige materia, asesor, curso, aula y tema avanzado de las sugerencias antes de guardar.")
      return
    }
    if (!form.horaInicio || !form.horaFin) {
      setGuardado("Completa la hora de inicio y fin.")
      return
    }
    if (form.horaFin <= form.horaInicio) {
      setGuardado("La hora de fin debe ser mayor que la de inicio.")
      return
    }
    const marcados = alumnos
      .map((a) => ({
        id_estudiante: a.id_estudiante ?? a.id,
        nombre: nombreEstudiante(a),
        presente: asistencia[a.id_estudiante ?? a.id] ?? null,
      }))
      .filter((m) => m.presente !== null)
    if (marcados.length === 0) {
      setGuardado("Marca al menos un estudiante como presente o ausente antes de guardar.")
      return
    }
    setSaving(true)
    setGuardado("")
    try {
      const horario = `${form.horaInicio} - ${form.horaFin}`
      const { idClase, fallos } = await guardarListaEnBD({
        idCurso: form.idCurso,
        idAsesor: form.idAsesor,
        idTema: Number(form.idTema),
        fecha: form.fecha,
        marcados,
      })
      if (fallos > 0) {
        setGuardado(`La clase se creó, pero ${fallos} asistencia(s) no se guardaron. Revisa e intenta de nuevo.`)
        return
      }
      // Éxito total: en localStorage queda SOLO la última lista.
      const payload = {
        guardadoEn: new Date().toISOString(),
        ...form,
        horario,
        aula: form.idAula,
        temaAvanzado: temaSeleccionado?.nombre_tema ?? "",
        curso: cursoSeleccionado?.nombre ?? "",
        id_clase: idClase,
        lista: marcados,
      }
      try {
        localStorage.setItem("ga_pase_lista", JSON.stringify(payload))
      } catch {
        // storage no disponible: la BD ya quedó guardada
      }
      setGuardado(`Lista guardada en BD (${marcados.length} asistencia(s), ${resumen.presentes} presente(s)). Ver pestaña Asistencias.`)
      onSaved?.()
    } catch (error) {
      setGuardado(error.message ?? "No se pudo guardar la lista.")
    } finally {
      setSaving(false)
    }
  }

  const total = alumnos.length
  const marcados = resumen.presentes + resumen.ausentes
  const pctP = total ? Math.round((resumen.presentes / total) * 100) : 0
  const pctA = total ? Math.round((resumen.ausentes / total) * 100) : 0

  return (
    <section className="tc">
      <div className="tc-head">
        <div>
          <h3 className="tc-title">
            {cursoSeleccionado?.nombre ?? "Arma la sesión y pasa lista"}
          </h3>
          <p className="tc-sub">
            {cursoSeleccionado
              ? `${cursoSeleccionado.nombre ?? ""}${cursoSeleccionado.nivel ? ` · ${cursoSeleccionado.nivel}` : ""} · ${alumnos.length} en lista`
              : "Completa los tres bloques y marca la asistencia abajo."}
          </p>
        </div>
        <div className="tc-meter" role="status" aria-live="polite" aria-label="Avance de marcado">
          <div className="tc-meter-row">
            <span className="tc-meter-count">{marcados}/{total || "—"}</span>
            <span className="tc-meter-label">marcados</span>
          </div>
          <div className="tc-bar" aria-hidden="true">
            <span className="tc-bar-p" style={{ width: `${pctP}%` }} />
            <span className="tc-bar-a" style={{ width: `${pctA}%` }} />
          </div>
          <div className="tc-chips">
            <span className="tc-chip p">{resumen.presentes} presentes</span>
            <span className="tc-chip a">{resumen.ausentes} ausentes</span>
            <span className="tc-chip u">{resumen.sinMarcar} sin marcar</span>
          </div>
        </div>
      </div>

      <div className="tc-grid">
        <div className="tc-sheet">
          <form
            onSubmit={(e) => { e.preventDefault(); handleGuardar() }}
            style={{ display: "grid", gap: 16 }}
          >
            <div className="tc-block">
              <h3>Qué se enseña</h3>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`materia-${form.idMateria}`}
                  id="pl-materia"
                  label="Materia"
                  options={materiaOptions}
                  value={form.idMateria || null}
                  onSelect={(v) => setField("idMateria", v)}
                  placeholder="Escribe para buscar materia..."
                  hint="Escribe y elige una sugerencia de la lista."
                />
              </Suspense>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`tema-${form.idTema}`}
                  id="pl-tema"
                  label="Tema avanzado"
                  options={temaOptions}
                  value={form.idTema || null}
                  onSelect={(v) => setField("idTema", v)}
                  placeholder="Escribe para buscar tema..."
                  hint="Escribe y elige una sugerencia de la lista."
                />
              </Suspense>
              {!showNuevoTema ? (
                <button type="button" className="tc-textbtn" onClick={() => setShowNuevoTema(true)}>
                  ＋ Nuevo tema para esta materia
                </button>
              ) : (
                <div className="tc-newtema">
                  <p className="tc-hint" style={{ margin: 0 }}>Adicionar tema a la base de datos (materia seleccionada).</p>
                  <TextField
                    id="pl-nuevo-tema"
                    label="Nombre del tema nuevo"
                    type="text"
                    value={nuevoTemaNombre}
                    onChange={(e) => setNuevoTemaNombre(e.target.value)}
                    maxLength={150}
                    required
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <Button size="sm" type="button" disabled={savingTema} onClick={handleCrearTema}>
                      {savingTema ? "Adicionando..." : "Adicionar tema"}
                    </Button>
                    <Button size="sm" variant="secondary" type="button" onClick={() => { setShowNuevoTema(false); setNuevoTemaNombre("") }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="tc-block">
              <h3>Quién y dónde</h3>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`curso-${form.idCurso}`}
                  id="pl-curso"
                  label="Curso de capacitación"
                  options={cursoOptions}
                  value={form.idCurso || null}
                  onSelect={(v) => setField("idCurso", v)}
                  placeholder="Escribe para buscar curso..."
                  hint="Al elegirlo se autocompletan aula y horario."
                />
              </Suspense>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`asesor-${form.idAsesor}`}
                  id="pl-asesor"
                  label="Asesor"
                  options={asesorOptions}
                  value={form.idAsesor || null}
                  onSelect={(v) => setField("idAsesor", v)}
                  placeholder="Escribe para buscar asesor..."
                  hint="Escribe y elige una sugerencia de la lista."
                />
              </Suspense>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`aula-${form.idAula}`}
                  id="pl-aula"
                  label="Aula"
                  options={aulaOptions}
                  value={form.idAula || null}
                  onSelect={(v) => setField("idAula", v)}
                  placeholder="Escribe para buscar aula..."
                  hint="Escribe y elige una sugerencia de la lista."
                />
              </Suspense>
            </div>

            <div className="tc-block">
              <h3>Cuándo</h3>
              <div className="form-row">
                <label htmlFor="pl-fecha">Fecha</label>
                <input id="pl-fecha" type="date" value={form.fecha} onChange={(e) => setField("fecha", e.target.value)} required />
              </div>
              <div className="tc-pair">
                <div className="form-row">
                  <label htmlFor="pl-hora-inicio">Hora inicio</label>
                  <input id="pl-hora-inicio" type="time" value={form.horaInicio} onChange={(e) => setField("horaInicio", e.target.value)} required />
                </div>
                <div className="form-row">
                  <label htmlFor="pl-hora-fin">Hora fin</label>
                  <input id="pl-hora-fin" type="time" value={form.horaFin} onChange={(e) => setField("horaFin", e.target.value)} required />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div>
          {!form.idCurso ? (
            <div className="tc-empty">
              <strong>Elige un curso para ver su lista.</strong>
              <p style={{ margin: "6px 0 0" }}>Los estudiantes aparecen aquí con un interruptor grande de Presente / Ausente, pensado para marcar rápido en clase.</p>
            </div>
          ) : loadingAlumnos ? (
            <Skeleton lines={5} />
          ) : alumnos.length === 0 ? (
            <div className="tc-empty">No hay estudiantes registrados en este curso.</div>
          ) : (
            <Suspense fallback={<Skeleton lines={5} />}>
              <PaseListaTable
                alumnos={alumnos}
                nombreDe={nombreEstudiante}
                asistencia={asistencia}
                onToggle={toggleAsistencia}
                onMarcarTodos={marcarTodos}
                resumen={resumen}
                nota={alumnosNota}
              />
            </Suspense>
          )}
        </div>
      </div>

      {form.idCurso && alumnos.length > 0 && (
        <div className="tc-foot">
          <Button type="button" onClick={handleGuardar} disabled={saving}>{saving ? "Guardando..." : `Guardar lista · ${marcados}/${total}`}</Button>
          {guardado && <span className="tc-status" role="status">{guardado}</span>}
        </div>
      )}
    </section>
  )
}
