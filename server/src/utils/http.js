function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function badRequest(message, details) {
  const error = new Error(message);
  error.status = 400;
  error.details = details;
  return error;
}

function notFound(message) {
  const error = new Error(message);
  error.status = 404;
  return error;
}

function forbidden(message) {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function parseDateRange(query) {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${now.getFullYear()}-${month}-${day}`;
  return {
    from: query.from || today,
    to: query.to || query.from || today,
  };
}

function toNumber(value) {
  return Number(value || 0);
}

module.exports = {
  asyncHandler,
  badRequest,
  forbidden,
  notFound,
  parseDateRange,
  toNumber,
};
