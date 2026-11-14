const path = require('path');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// A file is accepted only if its EXTENSION and its first bytes ("magic bytes") agree.
// The browser-supplied Content-Type is ignored because the client controls it.
const TYPES = {
  '.pdf': { mime: 'application/pdf', signature: Buffer.from('%PDF-') },
  '.docx': {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    signature: Buffer.from([0x50, 0x4b, 0x03, 0x04]), // a ZIP container
  },
  '.doc': { mime: 'application/msword', signature: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) },
};

const ALLOWED_EXTENSIONS = Object.keys(TYPES);

function extensionOf(filename) {
  return path.extname(String(filename || '')).toLowerCase();
}

// Cheap check used before the upload is read (by extension only).
function hasAllowedExtension(filename) {
  return ALLOWED_EXTENSIONS.includes(extensionOf(filename));
}

// Returns { ext, mime } or null when the content does not match the claimed type.
function detectFileType(buffer, filename) {
  const ext = extensionOf(filename);
  const type = TYPES[ext];
  if (!type || !Buffer.isBuffer(buffer) || buffer.length < type.signature.length) return null;
  return buffer.subarray(0, type.signature.length).equals(type.signature) ? { ext, mime: type.mime } : null;
}

// Display name only (the file on disk gets a random name). Strips folders and control characters.
function sanitizeFilename(name) {
  const base = path.basename(String(name || 'document').replace(/\\/g, '/'));
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim();
  return (cleaned || 'document').slice(0, 150);
}

module.exports = { MAX_FILE_SIZE, ALLOWED_EXTENSIONS, hasAllowedExtension, detectFileType, sanitizeFilename };
