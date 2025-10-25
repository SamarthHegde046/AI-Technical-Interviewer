// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['recruiter', 'candidate'], required: true },
  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpiry: { type: Date },
  // Candidate Profile Fields
  profile: {
    phone: { type: String },
    location: { type: String },
    bio: { type: String },
    techStack: [{ type: String }],
    experience: { type: String },
    education: { type: String },
    resume: { type: String },
    portfolio: { type: String },
    linkedin: { type: String },
    github: { type: String },
    projects: [{
      name: { type: String },
      description: { type: String },
      githubLink: { type: String },
      techUsed: [{ type: String }],
      liveLink: { type: String }
    }],
    skills: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
