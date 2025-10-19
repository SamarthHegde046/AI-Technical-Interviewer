// models/Application.js
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  candidateName: { type: String, required: true },
  candidateEmail: { type: String, required: true },
  phone: { type: String, required: true },
  techStack: [{ type: String, required: true }],
  experience: { type: String, required: true },
  projects: [{
    name: { type: String, required: true },
    description: { type: String, required: true },
    githubLink: { type: String, required: true },
    techUsed: [{ type: String }]
  }],
  resume: { type: String },
  coverLetter: { type: String },
  status: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'rejected'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);
