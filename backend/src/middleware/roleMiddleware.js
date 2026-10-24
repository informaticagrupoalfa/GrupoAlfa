export const hasAnyRole = (user, allowedRoles) => {
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  return roles.some((role) => allowedRoles.includes(role));
};

export const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!hasAnyRole(req.user, allowedRoles)) {
    return res.status(403).json({
      error: "No tienes permisos para acceder a este recurso",
    });
  }
  next();
};
