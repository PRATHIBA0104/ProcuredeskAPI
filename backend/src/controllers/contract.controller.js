const fs = require('fs');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const contractService = require('../services/contract.service');

exports.list = asyncHandler(async (req, res) => {
  const result = await contractService.list(req.organizationId, req.query);
  res.json({ success: true, ...result });
});

exports.create = asyncHandler(async (req, res) => {
  const contract = await contractService.create(req.user, req.body);
  res.status(201).json({ success: true, contract });
});

exports.get = asyncHandler(async (req, res) => {
  const contract = await contractService.getById(req.organizationId, req.params.id);
  res.json({ success: true, contract });
});

exports.update = asyncHandler(async (req, res) => {
  const contract = await contractService.update(req.user, req.params.id, req.body);
  res.json({ success: true, contract });
});

exports.changeStatus = asyncHandler(async (req, res) => {
  const contract = await contractService.changeStatus(req.user, req.params.id, req.body.status);
  res.json({ success: true, contract });
});

exports.uploadDocument = asyncHandler(async (req, res) => {
  const document = await contractService.addDocument(req.user, req.params.id, req.file);
  res.status(201).json({ success: true, document });
});

exports.downloadDocument = asyncHandler(async (req, res) => {
  const { doc, filePath } = await contractService.getDocument(req.organizationId, req.params.id, req.params.docId);
  if (!fs.existsSync(filePath)) throw new AppError('The file is missing on the server', 404);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // "attachment" makes the browser download the file instead of rendering it.
  res.download(filePath, doc.originalName, (err) => {
    if (err && !res.headersSent) throw new AppError('Could not send the file', 500);
  });
});

exports.removeDocument = asyncHandler(async (req, res) => {
  await contractService.removeDocument(req.user, req.params.id, req.params.docId);
  res.json({ success: true, message: 'Document removed' });
});
