const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Organization name is required'], trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);
