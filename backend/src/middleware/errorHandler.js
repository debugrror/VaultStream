export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Unexpected server error',
    details: err.details || null
  });
}
