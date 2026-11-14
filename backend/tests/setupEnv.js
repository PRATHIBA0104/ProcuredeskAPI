const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:3000';
// Uploaded test files go to a throwaway folder, never into backend/uploads.
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `b2b-procurement-test-uploads-${process.pid}`);
