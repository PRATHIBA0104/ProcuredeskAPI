const multer = require('multer');
const AppError = require('../utils/AppError');
const { MAX_FILE_SIZE, hasAllowedExtension } = require('../utils/fileValidation');

// The file is held in memory (max 10 MB) so the service can check its real content
// BEFORE anything is written to disk. Rejected files never touch the file system.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 5 },
  fileFilter(req, file, cb) {
    if (!hasAllowedExtension(file.originalname)) {
      return cb(new AppError('Only PDF, DOC and DOCX files are allowed', 400));
    }
    cb(null, true);
  },
});

module.exports = upload.single('file'); // the form field must be named "file"
