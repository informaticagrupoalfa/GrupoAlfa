import { useMemo, useState } from "react"
import PropTypes from "prop-types"
import Modal from "../../../components/ui/Modal"
import { apiClient } from "../../../services/apiClient"

export default function FacultyCareersSection({ faculty, careers, faculties, onChanged }) {
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [careerName, setCareerName] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const selectedId = faculty?.id_facultad
  const visible = useMemo(() => careers.filter(career =>
    `${career.nombre} ${career.id_carrera}`.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es")),
  ), [careers, search])
  const assignedCount = careers.filter(career => String(career.id_facultad) === String(selectedId)).length

  const createCareer = async event => {
    event.preventDefault()
    const nombre = careerName.trim()
    if (!nombre || !selectedId || busy) return
    setBusy(true)
    setMessage("")
    try {
      await apiClient.post("/carreras", { nombre, id_facultad: Number(selectedId) })
      await onChanged()
      setCareerName("")
      setModalOpen(false)
      setMessage(`Carrera «${nombre}» creada y asignada a ${faculty.nombre}.`)
    } catch (error) {
      setMessage(error.userMessage || error.response?.data?.message || "No se pudo crear la carrera.")
    } finally {
      setBusy(false)
    }
  }

  const changeCareerFaculty = async (career, remove = false) => {
    if (!selectedId || busy) return
    setBusy(true)
    setMessage("")
    try {
      await apiClient.put(`/carreras/${career.id_carrera}`, { id_facultad: remove ? null : Number(selectedId) })
      await onChanged()
      setMessage(remove ? `«${career.nombre}» desasignada de ${faculty.nombre}.` : `«${career.nombre}» asignada a ${faculty.nombre}.`)
    } catch (error) {
      setMessage(error.userMessage || error.response?.data?.message || (remove ? "No se pudo desasignar la carrera." : "No se pudo asignar la carrera."))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="faculty-careers" aria-label="Carreras de la facultad">
      <div className="faculty-careers-head">
        <div><h3>Carreras</h3><p>{selectedId ? `${assignedCount} asignadas a ${faculty.nombre}` : "Guarda la facultad para agregar y asignar carreras."}</p></div>
        <button type="button" disabled={!selectedId || busy} onClick={() => { setMessage(""); setModalOpen(true) }}>Agregar carrera</button>
      </div>
      <label className="faculty-careers-search">Buscar en todas las carreras
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nombre o ID de carrera" />
      </label>
      <div className="faculty-careers-list">
        {visible.length === 0 && <p className="faculty-careers-empty">{careers.length ? "No hay carreras que coincidan con la búsqueda." : "Todavía no hay carreras. Guarda una facultad y agrega la primera."}</p>}
        {visible.map(career => {
          const assigned = selectedId != null && String(career.id_facultad) === String(selectedId)
          const owner = faculties.find(item => String(item.id_facultad) === String(career.id_facultad))
          return <div className="faculty-career" key={career.id_carrera}>
            <div><strong>{career.nombre}</strong><small>#{career.id_carrera} · {assigned ? "Asignada a esta facultad" : owner?.nombre || "Sin facultad"}</small></div>
            <button type="button" className={assigned ? "remove" : undefined} disabled={!selectedId || busy} onClick={() => changeCareerFaculty(career, assigned)}>{assigned ? "Desasignar" : "Asignar"}</button>
          </div>
        })}
      </div>
      {message && <p className="faculty-careers-message" role="status">{message}</p>}
      {modalOpen && <Modal title="Agregar carrera" hint={`Se asignará a ${faculty.nombre}.`} onClose={() => { if (!busy) setModalOpen(false) }}>
        <form onSubmit={createCareer} className="faculty-career-form">
          <Modal.Body>
            <label htmlFor="new-career-name">Nombre de la carrera</label>
            <input id="new-career-name" autoFocus required maxLength={150} value={careerName} onChange={event => setCareerName(event.target.value)} placeholder="Ej. Ingeniería de Sistemas" />
            {message && <p role="alert" className="error-message">{message}</p>}
          </Modal.Body>
          <Modal.Footer>
            <button type="button" className="subtle" disabled={busy} onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="submit" disabled={busy || !careerName.trim()}>{busy ? "Guardando…" : "Crear y asignar"}</button>
          </Modal.Footer>
        </form>
      </Modal>}
    </section>
  )
}

FacultyCareersSection.propTypes = {
  faculty: PropTypes.object,
  careers: PropTypes.array.isRequired,
  faculties: PropTypes.array.isRequired,
  onChanged: PropTypes.func.isRequired,
}
