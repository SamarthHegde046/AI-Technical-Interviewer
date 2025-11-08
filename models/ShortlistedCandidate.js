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
  interviewStatus: {
    type: String,
    enum: ['pending', 'calling', 'call_completed', 'scheduled', 'completed', 'cancelled', 'declined'],
    default: 'pending'
  },
  scheduledInterviewDate: {
    type: Date
  },
  aiInterviewSessionId: {
    type: String
  },
  // Call tracking (individual fields for backward compatibility)
  callAttempts: { type: Number, default: 0 },
  lastCallDate: { type: Date },
  callSid: { type: String },
  callStatus: { type: String }, // twilio call status
  callDuration: { type: Number }, // in seconds
  candidateResponse: { type: String }, // 'accepted', 'declined', 'no_answer', 'busy'
  
  // Call tracking object (added by AI service)
  call_tracking: {
    total_attempts: { type: Number },
    max_attempts: { type: Number },
    status: { type: String }, // 'interview_scheduled', 'declined', 'completed', etc.
    last_contact_date: { type: String },
    call_history: [{
      call_sid: String,
      initiated_at: String,
      status: String,
      outcome: String,
      duration: Number,
      notes: String
    }],
    interview_details: {
      scheduled_slot: String,
      scheduled_at: String,
      call_sid: String,
      email_sent: Boolean,
      confirmation_sent_at: String
    },
    created_at: String,
    updated_at: String
  },
  
  techStack: [{ type: String }],
  experience: { type: String },
  notes: { type: String }
});

shortlistedCandidateSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('ShortlistedCandidate', shortlistedCandidateSchema);
