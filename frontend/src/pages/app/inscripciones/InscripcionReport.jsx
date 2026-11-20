import PropTypes from "prop-types"

const show = (value) => value === null || value === undefined || value === "" ? "No registrado" : String(value)
const yesNo = (value) => value ? "Sí" : "No"
const date = (value) => {
  if (!value) return "No registrado"
  const text = String(value).slice(0, 10)
  return `${text.slice(8, 10)}/${text.slice(5, 7)}/${text.slice(0, 4)}`
}
const fullName = (...parts) => parts.filter(Boolean).join(" ")

function ReportSection({ title, fields }) {
  return (
    <section className="reporte-seccion">
      <h3>{title}</h3>
      <dl className="reporte-campos">
        {fields.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{show(value)}</dd></div>
        ))}
      </dl>
    </section>
  )
}

ReportSection.propTypes = {
  title: PropTypes.string.isRequired,
  fields: PropTypes.arrayOf(PropTypes.array).isRequired,
}

export default function InscripcionReport({ record, codigoConducta, visible }) {
  const nombre = fullName(record.nombre, record.apellido_paterno, record.apellido_materno)
  const apoderado = fullName(record.apoderado_nombre, record.apoderado_apellido_paterno, record.apoderado_apellido_materno)
  const administrativo = fullName(record.administrativo_nombre, record.administrativo_apellido_paterno, record.administrativo_apellido_materno)
  const horario = [record.hora_inicio?.slice(0, 5), record.hora_fin?.slice(0, 5)].filter(Boolean).join(" a ")
  const foto = record.foto_base64
    ? `data:image/${record.foto_base64.startsWith("UklG") ? "webp" : record.foto_base64.startsWith("iVBOR") ? "png" : "jpeg"};base64,${record.foto_base64}`
    : null

  return (
    <article className={`registro-reporte${visible ? "" : " is-hidden"}`} aria-label="Reporte de inscripción">
      <header className="reporte-encabezado">
        <div><strong>CCTP Grupo Alfa Malaver S.R.L.</strong><h2>Reporte de inscripción</h2></div>
        <div className="reporte-referencia"><span>Inscripción #{record.id_inscripcion}</span><span>Emitido el {new Date().toLocaleDateString("es-BO")}</span></div>
      </header>

      <ReportSection title="Datos académicos" fields={[
        ["Carrera a la que postula", record.carrera_nombre],
        ["Facultad", record.facultad],
        ["Paralelo / grupo", record.grupo || record.nombre_paralelo],
        ["ID de paralelo", record.id_paralelo],
        ["Nivel", record.nivel],
        ["Inicio de clases", date(record.inicio_clases)],
        ["Modalidad", record.modalidad],
        ["Horario", horario],
        ["Días", record.dias],
        ["Nº de credencial", record.num_credencial],
        ["Recálculo", yesNo(record.recalculo)],
        ["Preparación previa", yesNo(record.preparacion_previa)],
        ["Tiempo de preparación (meses)", record.tiempo_de_preparacion_meses],
        ["Lugar de preparación", record.lugar_de_preparacion],
        ["Fecha de inscripción", date(record.fecha_insc)],
        ["Cómo se enteró de nosotros", record.como_se_entero_de_nosotros],
        ["Detalle del medio", record.como_se_entero_detalle],
      ]} />

      <section className="reporte-seccion">
        <h3>Datos personales del estudiante</h3>
        <div className="reporte-estudiante">
          <ReportSection title="Identificación y contacto" fields={[
            ["ID del estudiante", record.id_estudiante],
            ["CI", record.ci],
            ["Apellido paterno", record.apellido_paterno],
            ["Apellido materno", record.apellido_materno],
            ["Nombre", record.nombre],
            ["Fecha de nacimiento", date(record.fecha_nacimiento)],
            ["Celular", record.celular],
            ["Correo electrónico", record.correo_electronico],
            ["Colegio de procedencia", record.colegio_de_procedencia],
            ["Dirección de domicilio", record.direccion_de_domicilio],
          ]} />
          {foto && <img className="reporte-foto" src={foto} alt={`Foto de ${nombre || "estudiante"}`} />}
        </div>
      </section>

      <ReportSection title="Datos del apoderado" fields={[
        ["Apoderado registrado", apoderado],
        ["CI", record.apoderado_ci],
        ["Parentesco", record.apoderado_parentesco],
        ["Apellido paterno", record.apoderado_apellido_paterno],
        ["Apellido materno", record.apoderado_apellido_materno],
        ["Nombre", record.apoderado_nombre],
        ["Teléfono", record.apoderado_telefono],
        ["Correo electrónico", record.apoderado_correo_electronico],
      ]} />

      <ReportSection title="Datos administrativos" fields={[
        ["Elaborado por", record.elaborado_por || administrativo],
        ["ID administrativo", record.id_administrativo],
        ["Sucursal", record.sucursal],
        ["Fecha de registro", date(record.fecha_registro)],
      ]} />

      <p className="reporte-seguridad">Las contraseñas no se incluyen en el reporte.</p>
      <section className="reporte-conducta">
        <h3>Código de conducta</h3>
        <p>{codigoConducta.trim() || "Sin código de conducta."}</p>
      </section>
    </article>
  )
}

InscripcionReport.propTypes = {
  record: PropTypes.object.isRequired,
  codigoConducta: PropTypes.string.isRequired,
  visible: PropTypes.bool.isRequired,
}
