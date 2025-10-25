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
    techUsed: [{ type: String }],
    // AI Detection Results
    aiAnalysis: {
      status: { type: String, enum: ['pending', 'analyzing', 'completed', 'failed'], default: 'pending' },
      summary: {
        total_files_found: Number,
        files_analyzed: Number,
        ai_files: Number,
        human_files: Number,
        ai_percentage: Number,
        human_percentage: Number,
        avg_confidence: Number,
        total_lines: Number,
        total_ai_lines: Number,
        total_human_lines: Number,
        ai_lines_percentage: Number,
        human_lines_percentage: Number
      },
      files: [{
        file_path: String,
        prediction: String,
        confidence: Number,
        line_count: Number,
        ai_lines: Number,
        human_lines: Number
      }],
      repository: {
        owner: String,
        name: String,
        url: String
      },
      analyzedAt: Date,
      error: String
    }
  }],
  resume: { type: String },
  coverLetter: { type: String },
  status: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'rejected'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Application', applicationSchema);