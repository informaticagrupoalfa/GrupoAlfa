import { Suspense, lazy, useEffect, useMemo, useState } from "react"
import PropTypes from "prop-types"
import Skeleton from "../../../components/ui/Skeleton"
import Button from "../../../components/ui/Button"
import TextField from "../../../components/ui/TextField"
import { useAuth } from "../../../hooks/useAuth"
import { listResource } from "../../../services/academicService"
import { guardarListaEnBD, loadEstudiantesPorParalelo } from "../../../services/paseListaService"
import "../../../components/pase-lista/TomarClase.css"

// split-dynamic-imports: la tabla solo se carga cuando hay curso seleccionado.
const PaseListaTable = lazy(() => import("../../../components/pase-lista/PaseListaTable.jsx"))
const PersonCombobox = lazy(() => import("../../../components/features/matriculaciones/PersonCombobox.jsx"))

const initialForm = {
  idMateria: "",
  idAsesor: "",
  horaInicio: "",
  horaFin: "",
  idParalelo: "",
  idAula: "",
  fecha: new Date().toISOString().slice(0, 10),
  tema: "",
}

function userName(u) {
  if (!u) return ""
  const full = [u.nombre, u.apellido_paterno, u.apellido_materno].filter(Boolean).join(" ")
  return full || u.nombre_completo || u.correo_electronico || `Usuario ${u.id_usuario ?? u.nro_carnet ?? ""}`
}

export default function TomarClaseView({ catalogs, onSaved, initialAsesorId = null }) {
  const { activeRole } = useAuth()
  const isAdministracion = activeRole === "Administración"
  const [form, setForm] = useState(initialForm)
  const [alumnos, setAlumnos] = useState([])
  const [loadingAlumnos, setLoadingAlumnos] = useState(false)
  const [alumnosNota, setAlumnosNota] = useState("")
  const [asistencia, setAsistencia] = useState({})
  const [guardado, setGuardado] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initialAsesorId != null) {
      setForm((current) => ({ ...current, idAsesor: initialAsesorId }))
    }
  }, [initialAsesorId])

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

  const paraleloSeleccionado = useMemo(
    () => (catalogs.paralelos ?? []).find((p) => String(p.id_paralelo) === String(form.idParalelo)),
    [catalogs.paralelos, form.idParalelo],
  )

  const materiasDelParalelo = useMemo(() => {
    if (!paraleloSeleccionado) return null
    const ids = new Set(
      (catalogs.materiasCapacitacion ?? [])
        .filter((mc) => String(mc.id_capacitacion) === String(paraleloSeleccionado.id_capacitacion))
        .map((mc) => String(mc.id_materia)),
    )
    return ids
  }, [catalogs.materiasCapacitacion, paraleloSeleccionado])

  const materiaOptions = useMemo(
    () =>
      (catalogs.materias ?? [])
        .filter((m) => !materiasDelParalelo || materiasDelParalelo.has(String(m.id_materia)))
        .map((m) => ({ value: m.id_materia, label: m.nombre_materia })),
    [catalogs.materias, materiasDelParalelo],
  )
  const asesorOptions = useMemo(
    () =>
      (catalogs.asesores ?? []).map((a) => ({
        value: a.id_asesor,
        label: a.nombre_completo ?? userName(usuariosById.get(String(a.id_usuario))) ?? `Asesor ${a.id_asesor}`,
      })),
    [catalogs.asesores, usuariosById],
  )
  const paraleloOptions = useMemo(
    () =>
      (catalogs.paralelos ?? []).map((p) => ({
        value: p.id_paralelo,
        label: `${p.nombre_paralelo}${p.nivel ? ` (${p.nivel})` : ""}${p.dias ? ` · ${p.dias}` : ""}`,
      })),
    [catalogs.paralelos],
  )
  const aulaOptions = useMemo(
    () =>
      (catalogs.aulas ?? []).map((a) => ({
        value: a.id_aula,
        label: `Aula ${a.id_aula} — cap. ${a.capacidad ?? "—"}`,
      })),
    [catalogs.aulas],
  )

  // Al elegir paralelo: autocompleta aula/horario y carga la lista de abajo.
  useEffect(() => {
    let mounted = true
    async function loadAlumnos() {
      if (!form.idParalelo) {
        setAlumnos([])
        setAlumnosNota("")
        setAsistencia({})
        return
      }
      setLoadingAlumnos(true)
      setGuardado("")
      try {
        if (paraleloSeleccionado) {
          setForm((prev) => ({
            ...prev,
            idAula: prev.idAula || (paraleloSeleccionado.id_aula != null ? String(paraleloSeleccionado.id_aula) : ""),
            horaInicio: prev.horaInicio || String(paraleloSeleccionado.hora_inicio ?? "").slice(0, 5),
            horaFin: prev.horaFin || String(paraleloSeleccionado.hora_fin ?? "").slice(0, 5),
          }))
        }
        const matriculas = await loadEstudiantesPorParalelo(form.idParalelo)
        let lista = []
        let nota = ""
        if (Array.isArray(matriculas) && matriculas.length > 0) {
          const ids = new Set(matriculas.map((m) => String(m.id_estudiante ?? m.estudiante ?? "")))
          lista = (catalogs.estudiantes ?? []).filter((e) => ids.has(String(e.id_estudiante)))
          if (lista.length === 0) lista = matriculas
        } else {
          const todos = await listResource("estudiantes").catch(() => catalogs.estudiantes ?? [])
          lista = Array.isArray(todos) ? todos : []
          nota = "El paralelo no tiene matrículas registradas; se muestran todos los estudiantes."
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
  }, [form.idParalelo])

  useEffect(() => {
    if (!form.idMateria || materiaOptions.length === 0) return
    if (!materiaOptions.some((m) => String(m.value) === String(form.idMateria))) {
      setForm((prev) => ({ ...prev, idMateria: "" }))
    }
  }, [form.idMateria, materiaOptions])

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

  const handleGuardar = async () => {
    if (saving) return
    if (!form.idParalelo || !form.fecha) {
      setGuardado("Elige un paralelo y una fecha antes de guardar.")
      return
    }
    if (!isAdministracion && (!form.idMateria || !form.idAsesor || !form.idAula || !form.tema.trim())) {
      setGuardado("Elige materia, asesor, paralelo y aula, e indica el tema antes de guardar.")
      return
    }
    if (!isAdministracion && (!form.horaInicio || !form.horaFin)) {
      setGuardado("Completa la hora de inicio y fin.")
      return
    }
    if (form.horaInicio && form.horaFin && form.horaFin <= form.horaInicio) {
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
    if (!isAdministracion && marcados.length === 0) {
      setGuardado("Marca al menos un estudiante como presente o ausente antes de guardar.")
      return
    }
    setSaving(true)
    setGuardado("")
    try {
      const horario = `${form.horaInicio} - ${form.horaFin}`
      const { idClase, fallos } = await guardarListaEnBD({
        idParalelo: form.idParalelo,
        idAsesor: form.idAsesor,
        tema: form.tema.trim(),
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
        temaAvanzado: form.tema.trim(),
        curso: paraleloSeleccionado?.nombre_paralelo ?? "",
        paralelo: paraleloSeleccionado?.nombre_paralelo ?? "",
        id_clase: idClase,
        lista: marcados,
      }
      try {
        localStorage.setItem("ga_pase_lista", JSON.stringify(payload))
      } catch {
        // storage no disponible: la BD ya quedó guardada
      }
      setGuardado(marcados.length === 0
        ? "Clase guardada en BD sin asistencias."
        : `Lista guardada en BD (${marcados.length} asistencia(s), ${resumen.presentes} presente(s)). Ver pestaña Asistencias.`)
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
            {paraleloSeleccionado?.nombre_paralelo ?? "Arma la sesión y pasa lista"}
          </h3>
          <p className="tc-sub">
            {paraleloSeleccionado
              ? `${paraleloSeleccionado.nombre_paralelo ?? ""}${paraleloSeleccionado.nivel ? ` · ${paraleloSeleccionado.nivel}` : ""}${paraleloSeleccionado.dias ? ` · ${paraleloSeleccionado.dias}` : ""} · ${alumnos.length} en lista`
              : isAdministracion ? "Elige un paralelo y una fecha. Los demás datos y las asistencias son opcionales." : "Completa los tres bloques y marca la asistencia abajo."}
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
                  label={isAdministracion ? "Materia (opcional)" : "Materia"}
                  options={materiaOptions}
                  value={form.idMateria || null}
                  onSelect={(v) => setField("idMateria", v)}
                  placeholder="Escribe para buscar materia..."
                  hint={isAdministracion ? "Opcional para Administración." : "Escribe y elige una sugerencia de la lista."}
                />
              </Suspense>
              <TextField
                id="pl-tema"
                label={isAdministracion ? "Tema avanzado (opcional)" : "Tema avanzado"}
                type="text"
                value={form.tema}
                onChange={(event) => setField("tema", event.target.value)}
                maxLength={100}
                required={!isAdministracion}
              />
            </div>

            <div className="tc-block">
              <h3>Quién y dónde</h3>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`paralelo-${form.idParalelo}`}
                  id="pl-paralelo"
                  label="Paralelo"
                  options={paraleloOptions}
                  value={form.idParalelo || null}
                  onSelect={(v) => setField("idParalelo", v)}
                  placeholder="Escribe para buscar paralelo..."
                  hint="Al elegirlo se autocompletan aula y horario."
                />
              </Suspense>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`asesor-${form.idAsesor}`}
                  id="pl-asesor"
                  label={isAdministracion ? "Asesor (opcional)" : "Asesor"}
                  options={asesorOptions}
                  value={form.idAsesor || null}
                  onSelect={(v) => setField("idAsesor", v)}
                  placeholder="Escribe para buscar asesor..."
                  hint={isAdministracion ? "Opcional para Administración." : "Escribe y elige una sugerencia de la lista."}
                />
              </Suspense>
              <Suspense fallback={<Skeleton lines={1} />}>
                <PersonCombobox
                  key={`aula-${form.idAula}`}
                  id="pl-aula"
                  label={isAdministracion ? "Aula (opcional)" : "Aula"}
                  options={aulaOptions}
                  value={form.idAula || null}
                  onSelect={(v) => setField("idAula", v)}
                  placeholder="Escribe para buscar aula..."
                  hint={isAdministracion ? "Opcional para Administración." : "Escribe y elige una sugerencia de la lista."}
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
                  <label htmlFor="pl-hora-inicio">Hora inicio{isAdministracion ? " (opcional)" : ""}</label>
                  <input id="pl-hora-inicio" type="time" value={form.horaInicio} onChange={(e) => setField("horaInicio", e.target.value)} required={!isAdministracion} />
                </div>
                <div className="form-row">
                  <label htmlFor="pl-hora-fin">Hora fin{isAdministracion ? " (opcional)" : ""}</label>
                  <input id="pl-hora-fin" type="time" value={form.horaFin} onChange={(e) => setField("horaFin", e.target.value)} required={!isAdministracion} />
                </div>
              </div>
            </div>
          </form>
        </div>

        <div>
          {!form.idParalelo ? (
            <div className="tc-empty">
              <strong>Elige un paralelo para ver su lista.</strong>
              <p style={{ margin: "6px 0 0" }}>Los estudiantes aparecen aquí con un interruptor grande de Presente / Ausente, pensado para marcar rápido en clase.</p>
            </div>
          ) : loadingAlumnos ? (
            <Skeleton lines={5} />
          ) : alumnos.length === 0 ? (
            <div className="tc-empty">{isAdministracion ? "No hay estudiantes registrados en este paralelo. Puedes crear la clase sin asistencias." : "No hay estudiantes registrados en este paralelo."}</div>
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

      {form.idParalelo && (isAdministracion || alumnos.length > 0) && (
        <div className="tc-foot">
          <Button type="button" onClick={handleGuardar} disabled={saving}>{saving ? "Guardando..." : isAdministracion ? "Guardar clase" : `Guardar lista · ${marcados}/${total}`}</Button>
          {guardado && <span className="tc-status" role="status">{guardado}</span>}
        </div>
      )}
    </section>
  )
}

TomarClaseView.propTypes = {
  catalogs: PropTypes.object.isRequired,
  onSaved: PropTypes.func.isRequired,
  initialAsesorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
}
