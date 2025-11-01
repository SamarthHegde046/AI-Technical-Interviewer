// routes/applications.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { auth, isCandidate, isRecruiter } = require('../middleware/auth');

// AI Detection API endpoint
const AI_DETECTOR_API = 'https://codedetector-4.onrender.com/api/analyze-repository';

// Function to analyze GitHub repository
const analyzeGitHubRepo = async (githubUrl, maxFiles = 20) => {
  try {
    const response = await axios.post(AI_DETECTOR_API, {
      github_url: githubUrl,
      max_files: maxFiles
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 80000 
    });
    
    return {
      status: 'completed',
      summary: response.data.summary,
      files: response.data.files,
      repository: response.data.repository,
      analyzedAt: new Date()
    };
  } catch (error) {
    console.error('AI Detection Error:', error.message);
    return {
      status: 'failed',
      error: error.response?.data?.error || error.message || 'Analysis failed',
      analyzedAt: new Date()
    };
  }
};

// Submit application (candidate only)
router.post('/', auth, isCandidate, async (req, res) => {
  try {
    const {
      jobId,
      candidateName,
      candidateEmail,
      phone,
      techStack,
      experience,
      projects,
      resume,
      coverLetter
    } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      candidate: req.user.userId
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'You have already applied to this job' });
    }

    // Create application with projects marked for analysis
    const projectsWithAnalysis = projects.map(project => ({
      ...project,
      aiAnalysis: {
        status: 'pending'
      }
    }));

    const application = new Application({
      job: jobId,
      candidate: req.user.userId,
      candidateName,
      candidateEmail,
      phone,
      techStack,
      experience,
      projects: projectsWithAnalysis,
      resume,
      coverLetter
    });

    await application.save();

    // Analyze GitHub repos asynchronously (don't wait)
    (async () => {
      for (let i = 0; i < projects.length; i++) {
        if (projects[i].githubLink) {
          try {
            application.projects[i].aiAnalysis.status = 'analyzing';
            await application.save();

            const analysisResult = await analyzeGitHubRepo(projects[i].githubLink);
            
            application.projects[i].aiAnalysis = analysisResult;
            await application.save();
            
            console.log(`✅ Analysis completed for project: ${projects[i].name}`);
          } catch (error) {
            console.error(`❌ Analysis failed for project: ${projects[i].name}`, error);
            application.projects[i].aiAnalysis.status = 'failed';
            application.projects[i].aiAnalysis.error = 'Analysis failed';
            await application.save();
          }
        }
      }
    })();

    res.status(201).json({ 
      message: 'Application submitted successfully. AI code analysis is in progress.',
      application 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get candidate's applications
router.get('/my-applications', auth, isCandidate, async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user.userId })
      .populate('job', 'title company location type')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get applications for a job (recruiter only)
router.get('/job/:jobId', auth, isRecruiter, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.recruiter.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const applications = await Application.find({ job: req.params.jobId })
      .populate('candidate', 'name email')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all applications for recruiter's jobs
router.get('/recruiter/all', auth, isRecruiter, async (req, res) => {
  try {
    const jobs = await Job.find({ recruiter: req.user.userId });
    const jobIds = jobs.map(job => job._id);

    const applications = await Application.find({ job: { $in: jobIds } })
      .populate('job', 'title company')
      .populate('candidate', 'name email')
      .sort({ appliedAt: -1 });

    res.json(applications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update application status (recruiter only)
router.patch('/:id/status', auth, isRecruiter, async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id).populate('job');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.job.recruiter.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    application.status = status;
    await application.save();

    res.json({ message: 'Application status updated', application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single application details
router.get('/:id', auth, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate('candidate', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check authorization
    const isOwner = application.candidate._id.toString() === req.user.userId;
    const isJobRecruiter = application.job.recruiter.toString() === req.user.userId;

    if (!isOwner && !isJobRecruiter) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Trigger AI analysis manually (recruiter only)
router.post('/:id/analyze-project/:projectIndex', auth, isRecruiter, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id).populate('job');
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.job.recruiter.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const projectIndex = parseInt(req.params.projectIndex);
    if (projectIndex < 0 || projectIndex >= application.projects.length) {
      return res.status(400).json({ message: 'Invalid project index' });
    }

    const project = application.projects[projectIndex];
    
    if (!project.githubLink) {
      return res.status(400).json({ message: 'No GitHub link provided' });
    }

    // Start analysis
    application.projects[projectIndex].aiAnalysis.status = 'analyzing';
    await application.save();

    // Perform analysis
    const analysisResult = await analyzeGitHubRepo(project.githubLink);
    
    application.projects[projectIndex].aiAnalysis = analysisResult;
    await application.save();

    res.json({ 
      message: 'Analysis completed',
      analysis: application.projects[projectIndex].aiAnalysis 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;