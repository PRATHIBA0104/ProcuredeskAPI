// Wraps an async route handler so a thrown error reaches the central error middleware.
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
