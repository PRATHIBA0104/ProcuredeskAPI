const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // Allow non-browser clients (no Origin header, e.g. Postman) and listed origins only.
      if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error('Origin not allowed by CORS'));
    },
  })
);
if (env.nodeEnv !== 'test') app.use(morgan('dev'));
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.nodeEnv === 'test',
  })
);
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
