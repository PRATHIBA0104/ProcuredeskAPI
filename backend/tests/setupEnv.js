const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
// Default test database: a local MongoDB. Override by setting TEST_MONGODB_URI (for example to Atlas).
// The database name must contain "test"; each Jest worker then gets its own copy (see tests/helpers/db.js).
process.env.TEST_MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/b2b_procurement_test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CORS_ORIGIN = 'http://localhost:3000';
// Uploaded test files go to a throwaway folder, never into backend/uploads.
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `b2b-procurement-test-uploads-${process.pid}`);
