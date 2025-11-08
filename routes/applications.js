// routes/applications.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { auth, isCandidate, isRecruiter } = require('../middleware/auth');

// Utility function to validate ObjectId
const isValidObjectId = (id) => {
  return id && id !== 'null' && id !== 'undefined' && /^[0-9a-fA-F]{24}$/.test(id);
};

// AI Detection API endpoint
const AI_DETECTOR_API = 'https://codedetector-4.onrender.com/api/analyze-repository';

// Function to analyze GitHub repository
const analyzeGitHubRepo = async (githubUrl, maxFiles = 20) => {
  try {
    console.log(`Starting AI analysis for: ${githubUrl}`);
    
    const response = await axios.post(AI_DETECTOR_API, {
      github_url: githubUrl,
      max_files: maxFiles
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000 // 120 second timeout (increased)
    });
    
    console.log('AI analysis completed successfully');
    
    return {
      status: 'completed',
      summary: response.data.summary,
      files: response.data.files,
      repository: response.data.repository,
      analyzedAt: new Date()
    };
  } catch (error) {
    console.error('AI Detection Error:', error.message);
    
    // Handle different error types
    let errorMessage = 'Analysis failed';
    
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Analysis timed out. The repository might be too large.';
    } else if (error.response?.status === 502 || error.response?.status === 503) {
      errorMessage = 'AI service temporarily unavailable. Please try again later.';
    } else if (error.response?.status === 404) {
      errorMessage = 'Repository not found or private. Please use a public repository.';
    } else if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    }
    
    return {
      status: 'failed',
      error: errorMessage,
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
            console.log(`Starting analysis for project ${i}: ${projects[i].name}`);
            
            application.projects[i].aiAnalysis = {
              status: 'analyzing'
            };
            await application.save();

            const analysisResult = await analyzeGitHubRepo(projects[i].githubLink);
            
            application.projects[i].aiAnalysis = analysisResult;
            await application.save();
            
            if (analysisResult.status === 'completed') {
              console.log(`✅ Analysis completed for project: ${projects[i].name}`);
            } else {
              console.log(`⚠️ Analysis failed for project: ${projects[i].name} - ${analysisResult.error}`);
            }
          } catch (error) {
            console.error(`❌ Analysis error for project: ${projects[i].name}`, error);
            application.projects[i].aiAnalysis = {
              status: 'failed',
              error: 'Unexpected error during analysis',
              analyzedAt: new Date()
            };
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
    const jobId = req.params.jobId;
    
    // Validate ObjectId format
    if (!isValidObjectId(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID format' });
    }
    
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.recruiter.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const applications = await Application.find({ job: jobId })
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
    const applicationId = req.params.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID format' });
    }
    
    const { status } = req.body;
    const application = await Application.findById(applicationId)
      .populate('job')
      .populate('candidate');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.job.recruiter.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const previousStatus = application.status;
    application.status = status;
    await application.save();

    // If status is changed to 'shortlisted', create a shortlisted candidate record
    if (status === 'shortlisted' && previousStatus !== 'shortlisted') {
      const ShortlistedCandidate = require('../models/ShortlistedCandidate');
      
      try {
        // Check if shortlisted candidate already exists
        const existingShortlisted = await ShortlistedCandidate.findOne({
          candidateId: application.candidate._id,
          jobId: application.job._id
        });

        if (!existingShortlisted) {
          const shortlistedCandidate = new ShortlistedCandidate({
            candidateId: application.candidate._id,
            applicationId: application._id,
            jobId: application.job._id,
            candidateName: application.candidateName,
            candidateEmail: application.candidateEmail,
            phoneNumber: application.phone,
            companyName: application.job.company,
            role: application.job.title,
            recruiterId: req.user.userId,
            techStack: application.techStack || [],
            experience: application.experience || '',
            interviewStatus: 'pending'
          });

          await shortlistedCandidate.save();
          console.log(`Created shortlisted candidate record for ${application.candidateName}`);
        }
      } catch (shortlistError) {
        console.error('Error creating shortlisted candidate:', shortlistError);
        // Don't fail the status update if shortlist creation fails
      }
    }
    
    // If status is changed from 'shortlisted' to something else, remove from shortlisted
    if (previousStatus === 'shortlisted' && status !== 'shortlisted') {
      const ShortlistedCandidate = require('../models/ShortlistedCandidate');
      
      try {
        await ShortlistedCandidate.deleteOne({
          candidateId: application.candidate._id,
          jobId: application.job._id
        });
        console.log(`Removed shortlisted candidate record for ${application.candidateName}`);
      } catch (removeError) {
        console.error('Error removing shortlisted candidate:', removeError);
        // Don't fail the status update if removal fails
      }
    }

    res.json({ message: 'Application status updated', application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single application details
router.get('/:id', auth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID format' });
    }
    
    const application = await Application.findById(applicationId)
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
    const applicationId = req.params.id;
    
    // Validate ObjectId format
    if (!isValidObjectId(applicationId)) {
      return res.status(400).json({ message: 'Invalid application ID format' });
    }
    
    const application = await Application.findById(applicationId).populate('job');
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Verify the job belongs to this recruiter
    if (!application.job || application.job.recruiter.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const projectIndex = parseInt(req.params.projectIndex);
    if (isNaN(projectIndex) || projectIndex < 0 || projectIndex >= application.projects.length) {
      return res.status(400).json({ message: 'Invalid project index' });
    }

    const project = application.projects[projectIndex];
    
    if (!project.githubLink) {
      return res.status(400).json({ message: 'No GitHub link provided' });
    }

    // Start analysis
    application.projects[projectIndex].aiAnalysis = {
      status: 'analyzing'
    };
    await application.save();

    // Perform analysis
    const analysisResult = await analyzeGitHubRepo(project.githubLink);
    
    application.projects[projectIndex].aiAnalysis = analysisResult;
    await application.save();

    res.json({ 
      message: analysisResult.status === 'completed' ? 'Analysis completed' : 'Analysis failed',
      analysis: application.projects[projectIndex].aiAnalysis 
    });
  } catch (err) {
    console.error('Manual analysis error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;