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
    if (detail.includes("correo_electronico")) {
      err.message = "El correo electrónico ya existe";
    } else if (detail.includes("nro_carnet")) {
      err.message = "El nro de carnet ya existe";
    } else if (detail.includes("id_usuario")) {
      err.message = "El id de usuario ya existe";
    } else {
      err.message = "Registro duplicado";
    }
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
