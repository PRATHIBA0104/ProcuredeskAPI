const path = require('path');
require('dotenv').config({ quiet: true });

// Fail fast: a server running with a missing or weak secret is a security problem,
// so we refuse to start instead of silently using a default.
function loadEnv() {
  const env = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 5000,
    mongoUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    // Where contract documents are stored (outside any public web folder).
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'),
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:3000')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };

  if (!env.jwtSecret || env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be set in backend/.env and be at least 32 characters long.');
  }
  return env;
}

module.exports = loadEnv();
