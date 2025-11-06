// models/ShortlistedCandidate.js
const mongoose = require('mongoose');

const shortlistedCandidateSchema = new mongoose.Schema({
  candidateId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  applicationId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Application', 
    required: true 
  },
  jobId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Job', 
    required: true 
  },
  candidateName: { 
    type: String, 
    required: true 
  },
  candidateEmail: { 
    type: String, 
    required: true 
  },
  phoneNumber: { 
    type: String, 
    required: true 
  },
  companyName: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    required: true 
  },
  recruiterId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  shortlistedAt: { 
    type: Date, 
    default: Date.now 
  },
  // AI Interview Scheduling Status
  interviewStatus: {
    type: String,
    enum: ['pending', 'scheduled', 'completed', 'cancelled'],
    default: 'pending'
  },
  scheduledInterviewDate: {
    type: Date
  },
  aiInterviewSessionId: {
    type: String
  },
  // Additional details for AI interview preparation
  techStack: [{ type: String }],
  experience: { type: String },
  notes: { type: String }
});

// Create unique index to prevent duplicate entries for same candidate-job combination
shortlistedCandidateSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('ShortlistedCandidate', shortlistedCandidateSchema);