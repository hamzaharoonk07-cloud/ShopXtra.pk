function notFound(req, res, next) {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  }
  res.status(404).sendFile(require('path').join(__dirname, '..', '..', 'client', '404.html'));
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
