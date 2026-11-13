const notFound = (req, res, next) => {
  const error = new Error(`Ruta ${req.originalUrl} no encontrada`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  console.error(`[error] ${err.statusCode} ${err.message}`, err.stack);

  // pg unique violation
  if (err.code === "23505") {
    err.statusCode = 409;
    const detail = err.detail || "";
    const columnMatch = detail.match(/Key \((.*?)\)=/);
    const column = columnMatch ? columnMatch[1] : null;
    const columnLabels = {
      nro_carnet: "nro de carnet",
      correo_electronico: "correo electrónico",
      id_usuario: "id de usuario",
      id_estudiante: "id de estudiante",
      id_inscripcion: "id de inscripción",
      id_apoderado: "id de apoderado",
      id_matriculacion: "id de matrícula",
      id_mensualidad: "id de mensualidad",
      nro_telefono: "número de teléfono",
    };
    const label = column ? (columnLabels[column] || column) : "campo";
    err.message = `El ${label} ya está en uso`;
  }

  // pg foreign key violation
  if (err.code === "23503") {
    err.statusCode = 409;
    err.message = "No se puede eliminar: el registro tiene datos asociados";
  }

  // pg invalid text representation (e.g. int)
  if (err.code === "22P02") {
    err.statusCode = 400;
    err.message = "Parámetro inválido";
  }

  // pg check constraint violation
  if (err.code === "23514" && err.constraint === "chk_capacitaciones_fechas") {
    err.statusCode = 400;
    err.message = "La fecha de fin no puede ser anterior a la fecha de inicio";
  }

  if (err.code === "23514" && err.constraint === "chk_paralelos_horas") {
    err.statusCode = 400;
    err.message = "La hora de fin debe ser posterior a la hora de inicio";
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export { notFound, errorHandler };
