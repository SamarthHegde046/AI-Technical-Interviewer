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
    
    // Use the correct endpoint from your FastAPI service
    const endpoint = '/make-actual-call';
    
    console.log(`Making AI call request to: ${aiCallerUrl}${endpoint}`);
    console.log(`Request payload:`, { candidate_id });
    
    const response = await axios.post(`${aiCallerUrl}${endpoint}`, {
      candidate_id: candidate_id
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 second timeout for AI calls
    });

    console.log('AI Caller Response:', response.data);
    
    // Forward the response from AI caller service
    res.json(response.data);
    
  } catch (error) {
    console.error('AI Caller Proxy Error:', error);
    
    if (error.response) {
      // AI caller service responded with an error
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      // Timeout error
      res.status(504).json({
        status: 'error',
        message: 'AI caller service timeout - please try again',
        error: 'Request timeout'
      });
    } else {
      // Network or other error
      res.status(500).json({
        status: 'error',
        message: 'Failed to connect to AI caller service',
        error: error.message
      });
    }
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));