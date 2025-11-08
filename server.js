// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/shortlisted', require('./routes/shortlisted'));

// AI Interview Caller Proxy Route
const axios = require('axios');

app.post('/api/ai-caller/make-call', async (req, res) => {
  try {
    const { candidate_id } = req.body;
    
    if (!candidate_id) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'candidate_id is required' 
      });
    }

    const aiCallerUrl = process.env.AI_CALLER_URL || 'http://localhost:8000';
    
    console.log(`Proxying AI call request for candidate: ${candidate_id}`);
    
    const endpoint = '/make-actual-call';
    
    console.log(`Making AI call request to: ${aiCallerUrl}${endpoint}`);
    console.log(`Request payload:`, { candidate_id });
    
    // Increased timeout and better configuration
    const response = await axios.post(`${aiCallerUrl}${endpoint}`, {
      candidate_id: candidate_id
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 60000, // Increased to 60 seconds
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    console.log('AI Caller Response:', response.data);
    
    res.json(response.data);
    
  } catch (error) {
    console.error('AI Caller Proxy Error:', error);
    
    if (error.response) {
      // Forward the exact error response from AI service
      res.status(error.response.status).json({
        status: 'error',
        message: error.response.data?.message || 'AI service error',
        error: error.response.data?.error || 'Unknown error',
        details: error.response.data
      });
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({
        status: 'error',
        message: 'AI caller service is taking longer than expected. The call may still be processing in the background.',
        error: 'Request timeout',
        suggestion: 'Please wait a moment and check the candidate status, or try again.'
      });
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({
        status: 'error',
        message: 'AI caller service is currently unavailable',
        error: 'Service unavailable',
        suggestion: 'Please try again in a few minutes.'
      });
    } else if (error.code === 'ENOTFOUND') {
      res.status(503).json({
        status: 'error',
        message: 'Cannot reach AI caller service',
        error: 'DNS resolution failed',
        suggestion: 'Please check your network connection or try again later.'
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Failed to connect to AI caller service',
        error: error.message,
        code: error.code,
        suggestion: 'Please try again or contact support if the issue persists.'
      });
    }
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));