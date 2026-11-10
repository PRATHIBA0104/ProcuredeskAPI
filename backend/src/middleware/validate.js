const AppError = require('../utils/AppError');

// validate(schema, 'body' | 'query' | 'params')
// Replaces the raw input with the parsed, trimmed, typed version, so controllers
// only ever see clean data (this also stops NoSQL operator objects like {"$ne": ""}).
module.exports = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const errors = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    return next(new AppError('Validation failed', 400, errors));
  }
  // req.query is a getter in Express 5, so define it instead of assigning.
  if (source === 'query') {
    Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
  } else {
    req[source] = result.data;
  }
  next();
};
