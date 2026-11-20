import PropTypes from "prop-types"

const visible = (value) => value === null || value === undefined || value === "" ? "—" : String(value)
const name = (...parts) => parts.filter(Boolean).join(" ")
const date = (value) => {
  const iso = String(value ?? "").slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso)
    ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4)
    : "—"
}

function Section({ title, fields }) {
  return (
    <section className="constancia-seccion">
      <h2>{title}</h2>
      <dl className="constancia-campos">
        {fields.map(([label, value]) => (
          <div className="constancia-campo" key={label}>
            <dt>{label}</dt>
            <dd>{visible(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

Section.propTypes = {
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(PropTypes.array).isRequired,
}

function Header({ logoUrl }) {
  return (
    <header className="constancia-encabezado">
      <img src={logoUrl} alt="Logotipo de Grupo Alfa" />
      <div className="constancia-institucion">
        <strong>CCTP Grupo Alfa Malaver S.R.L.</strong>
      </div>
      <div className="constancia-encabezado-espacio" aria-hidden="true" />
    </header>
  )
}

Header.propTypes = { logoUrl: PropTypes.string.isRequired }

function Footer({ issuedAt, page, totalPages, signatures = false }) {
  return (
    <footer className="constancia-pie">
      {signatures && (
        <div className="constancia-firmas">
          <div><span>Firma del responsable</span></div>
          <div><span>Sello institucional</span></div>
        </div>
      )}
      <div className="constancia-pie-linea">
        <span>Fecha de emisión: {issuedAt}</span>
        <span>Página {page} de {totalPages}</span>
      </div>
    </footer>
  )
}

Footer.propTypes = {
  issuedAt: PropTypes.string.isRequired,
  page: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  signatures: PropTypes.bool,
}

export default function InscripcionReport({ record, codigoConducta, logoUrl, issuedAt }) {
  const student = record.estudiante_nombre
    || name(record.nombre, record.apellido_paterno, record.apellido_materno)
  const guardian = name(record.apoderado_nombre, record.apoderado_apellido_paterno, record.apoderado_apellido_materno)
  const admin = name(record.administrativo_nombre, record.administrativo_apellido_paterno, record.administrativo_apellido_materno)
  const start = record.paralelo_hora_inicio ?? record.hora_inicio
  const end = record.paralelo_hora_fin ?? record.hora_fin
  const schedule = start || end ? [start, end].filter(Boolean).map((time) => String(time).slice(0, 5)).join(" a ") : null
  const conduct = codigoConducta.trim()
  const totalPages = conduct ? 2 : 1

  return (
    <main className="constancia-documento">
      <article className="constancia-pagina">
        <Header logoUrl={logoUrl} />
        <h1>CONSTANCIA DE INSCRIPCIÓN</h1>
        <p className="constancia-referencia">
          Registro Nº {visible(record.id_inscripcion)} · Credencial Nº {visible(record.num_credencial)}
        </p>
        <p className="constancia-introduccion">
          Por medio de la presente se deja constancia de que <strong>{student || "el/la estudiante"}</strong>,
          con C.I. <strong>{visible(record.estudiante_ci ?? record.ci)}</strong>, se encuentra inscrito/a
          en el programa académico que se detalla a continuación.
        </p>

        <Section title="Datos de la inscripción" fields={[
          ["Número de inscripción", record.id_inscripcion],
          ["Fecha de inscripción", date(record.fecha_insc)],
          ["Facultad", record.facultad_nombre ?? record.facultad],
          ["Carrera", record.carrera_nombre],
        ]} />
        <Section title="Capacitación y paralelo" fields={[
          ["Inicio de capacitación", date(record.capacitacion_inicio ?? record.inicio_clases)],
          ["Fin de capacitación", date(record.capacitacion_fin)],
          ["Paralelo", record.nombre_paralelo ?? record.grupo],
          ["Nivel", record.paralelo_nivel ?? record.nivel],
          ["Modalidad", record.paralelo_modalidad ?? record.modalidad],
          ["Días", record.paralelo_dias ?? record.dias],
          ["Horario", schedule],
          ["Aula", record.aula_codigo],
        ]} />
        <Section title="Estudiante" fields={[
          ["Nombre completo", student],
          ["Cédula de identidad", record.estudiante_ci ?? record.ci],
          ["Fecha de nacimiento", date(record.estudiante_fecha_nacimiento ?? record.fecha_nacimiento)],
          ["Correo electrónico", record.estudiante_correo ?? record.correo_electronico],
          ["Teléfono", record.estudiante_telefono ?? record.celular],
        ]} />
        <Section title="Apoderado y registro" fields={[
          ["Nombre del apoderado", guardian],
          ["Parentesco", record.apoderado_parentesco],
          ["Teléfono del apoderado", record.apoderado_telefono],
          ["Responsable de inscripción", admin],
        ]} />
        <Footer issuedAt={issuedAt} page={1} totalPages={totalPages} signatures />
      </article>

      {conduct && (
        <article className="constancia-pagina">
          <Header logoUrl={logoUrl} />
          <h1>CÓDIGO DE CONDUCTA</h1>
          <p className="constancia-referencia">
            Anexo a la constancia de inscripción Nº {visible(record.id_inscripcion)}
          </p>
          <div className="constancia-conducta">
            {conduct.split(/\r?\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </div>
          <Footer issuedAt={issuedAt} page={2} totalPages={totalPages} signatures />
        </article>
      )}
    </main>
  )
}

InscripcionReport.propTypes = {
  record: PropTypes.object.isRequired,
  codigoConducta: PropTypes.string.isRequired,
  logoUrl: PropTypes.string.isRequired,
  issuedAt: PropTypes.string.isRequired,
}
