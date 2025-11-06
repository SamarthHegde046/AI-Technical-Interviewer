// routes/shortlisted.js
const express = require('express');
const router = express.Router();
const ShortlistedCandidate = require('../models/ShortlistedCandidate');
const { auth, isRecruiter } = require('../middleware/auth');



// Get shortlisted candidates for a specific job - MUST come before /:id routes
router.get('/job/:jobId', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidates = await ShortlistedCandidate.find({ 
      jobId: req.params.jobId,
      recruiterId: req.user.userId 
    })
    .populate('candidateId', 'name email profile')
    .populate('jobId', 'title company location type')
    .populate('applicationId', 'appliedAt techStack experience')
    .sort({ shortlistedAt: -1 });

    res.json(shortlistedCandidates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shortlisted candidates ready for AI scheduling - MUST come before /:id routes
router.get('/pending-interviews', auth, isRecruiter, async (req, res) => {
  try {
    const pendingCandidates = await ShortlistedCandidate.find({ 
      recruiterId: req.user.userId,
      interviewStatus: 'pending'
    })
    .populate('candidateId', 'name email profile')
    .populate('jobId', 'title company location type requirements techStack')
    .populate('applicationId', 'appliedAt techStack experience projects')
    .sort({ shortlistedAt: -1 });

    // Format data for AI scheduling system
    const aiSchedulingData = pendingCandidates.map(candidate => ({
      shortlistedId: candidate._id,
      candidateId: candidate.candidateId._id,
      candidateName: candidate.candidateName,
      candidateEmail: candidate.candidateEmail,
      phoneNumber: candidate.phoneNumber,
      companyName: candidate.companyName,
      role: candidate.role,
      techStack: candidate.techStack,
      experience: candidate.experience,
      jobRequirements: candidate.jobId.requirements,
      jobTechStack: candidate.jobId.techStack,
      shortlistedAt: candidate.shortlistedAt
    }));

    res.json(aiSchedulingData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk export shortlisted candidates for AI system - MUST come before /:id routes
router.get('/export/ai-scheduling-data', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidates = await ShortlistedCandidate.find({ 
      recruiterId: req.user.userId 
    })
    .populate('candidateId', 'name email profile')
    .populate('jobId', 'title company location type requirements techStack')
    .populate('applicationId', 'techStack experience projects');

    const exportData = {
      exportedAt: new Date(),
      recruiterInfo: {
        recruiterId: req.user.userId
      },
      candidates: shortlistedCandidates.map(candidate => ({
        shortlistedId: candidate._id,
        candidateDetails: {
          candidateId: candidate.candidateId._id,
          name: candidate.candidateName,
          email: candidate.candidateEmail,
          phone: candidate.phoneNumber
        },
        jobDetails: {
          jobId: candidate.jobId._id,
          role: candidate.role,
          company: candidate.companyName,
          requirements: candidate.jobId.requirements,
          techStack: candidate.jobId.techStack
        },
        applicationDetails: {
          techStack: candidate.techStack,
          experience: candidate.experience,
          projects: candidate.applicationId?.projects || []
        },
        interviewDetails: {
          status: candidate.interviewStatus,
          scheduledDate: candidate.scheduledInterviewDate,
          sessionId: candidate.aiInterviewSessionId,
          notes: candidate.notes
        },
        timestamps: {
          shortlistedAt: candidate.shortlistedAt
        }
      }))
    };

    res.json(exportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// API endpoint for AI system to fetch all candidates - MUST come before /:id routes
router.get('/api/ai-candidates', async (req, res) => {
  try {
    // This endpoint can be used by the AI system without authentication
    // You might want to add API key authentication here for security
    
    const pendingCandidates = await ShortlistedCandidate.find({ 
      interviewStatus: 'pending'
    })
    .populate('candidateId', 'name email profile')
    .populate('jobId', 'title company location type requirements techStack salary')
    .populate('applicationId', 'appliedAt techStack experience projects')
    .populate('recruiterId', 'name email')
    .sort({ shortlistedAt: -1 });

    // Format data specifically for AI scheduling system
    const aiFormattedData = pendingCandidates.map(candidate => ({
      // Basic identifiers
      id: candidate._id,
      candidateId: candidate.candidateId._id,
      
      // Personal information
      candidateName: candidate.candidateName,
      candidateEmail: candidate.candidateEmail,
      phoneNumber: candidate.phoneNumber,
      
      // Job information
      companyName: candidate.companyName,
      role: candidate.role,
      jobId: candidate.jobId._id,
      jobRequirements: candidate.jobId.requirements,
      jobTechStack: candidate.jobId.techStack,
      jobSalary: candidate.jobId.salary,
      
      // Candidate technical details
      candidateTechStack: candidate.techStack,
      candidateExperience: candidate.experience,
      candidateProjects: candidate.applicationId?.projects || [],
      
      // Recruiter information
      recruiterName: candidate.recruiterId?.name,
      recruiterEmail: candidate.recruiterId?.email,
      recruiterId: candidate.recruiterId?._id,
      
      // Timing information
      shortlistedAt: candidate.shortlistedAt,
      
      // Status
      interviewStatus: candidate.interviewStatus
    }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalCandidates: aiFormattedData.length,
      candidates: aiFormattedData
    });
  } catch (err) {
    console.error('AI API Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch candidates for AI scheduling',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get all shortlisted candidates for the recruiter
router.get('/', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidates = await ShortlistedCandidate.find({})
      .populate('candidateId', 'name email phone skills experience')
      .populate('applicationId', 'status appliedAt')
      .populate('jobId', 'title company location')
      .sort({ shortlistedAt: -1 });
    
    res.json({ 
      shortlistedCandidates,
      success: true
    });
  } catch (error) {
    console.error('Error fetching shortlisted candidates:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      success: false
    });
  }
});

// Update interview status and schedule details - PARAMETERIZED ROUTES START HERE
router.patch('/:id/interview-status', auth, isRecruiter, async (req, res) => {
  try {
    const { interviewStatus, scheduledInterviewDate, aiInterviewSessionId, notes } = req.body;
    
    const shortlistedCandidate = await ShortlistedCandidate.findById(req.params.id);

    if (!shortlistedCandidate) {
      return res.status(404).json({ message: 'Shortlisted candidate not found' });
    }

    if (shortlistedCandidate.recruiterId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update the fields
    if (interviewStatus) shortlistedCandidate.interviewStatus = interviewStatus;
    if (scheduledInterviewDate) shortlistedCandidate.scheduledInterviewDate = scheduledInterviewDate;
    if (aiInterviewSessionId) shortlistedCandidate.aiInterviewSessionId = aiInterviewSessionId;
    if (notes) shortlistedCandidate.notes = notes;

    await shortlistedCandidate.save();

    res.json({ 
      message: 'Interview status updated', 
      shortlistedCandidate 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get AI-formatted JSON for a specific candidate (clean format for AI consumption)
router.get('/:id/ai-format', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidate = await ShortlistedCandidate.findById(req.params.id)
      .populate('candidateId', 'name email profile')
      .populate('jobId', 'title company location type description requirements techStack salary')
      .populate('applicationId', 'appliedAt techStack experience projects resume coverLetter')
      .populate('recruiterId', 'name email');

    if (!shortlistedCandidate) {
      return res.status(404).json({ message: 'Shortlisted candidate not found' });
    }

    if (shortlistedCandidate.recruiterId._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Format the response with comprehensive AI-ready data
    const aiFormattedResponse = {
      // Raw database record
      rawData: shortlistedCandidate,
      
      // AI-formatted structured data
      aiSchedulingData: {
        // Identifiers
        shortlistedId: shortlistedCandidate._id,
        candidateId: shortlistedCandidate.candidateId._id,
        applicationId: shortlistedCandidate.applicationId._id,
        jobId: shortlistedCandidate.jobId._id,
        recruiterId: shortlistedCandidate.recruiterId._id,
        
        // Personal Information
        personalInfo: {
          name: shortlistedCandidate.candidateName,
          email: shortlistedCandidate.candidateEmail,
          phone: shortlistedCandidate.phoneNumber,
          location: shortlistedCandidate.candidateId.profile?.location,
          bio: shortlistedCandidate.candidateId.profile?.bio,
          linkedin: shortlistedCandidate.candidateId.profile?.linkedin,
          github: shortlistedCandidate.candidateId.profile?.github,
          portfolio: shortlistedCandidate.candidateId.profile?.portfolio,
          resume: shortlistedCandidate.applicationId.resume
        },
        
        // Job Information
        jobInfo: {
          role: shortlistedCandidate.role,
          company: shortlistedCandidate.companyName,
          jobType: shortlistedCandidate.jobId.type,
          location: shortlistedCandidate.jobId.location,
          description: shortlistedCandidate.jobId.description,
          requirements: shortlistedCandidate.jobId.requirements,
          techStack: shortlistedCandidate.jobId.techStack,
          salary: shortlistedCandidate.jobId.salary
        },
        
        // Technical Profile
        technicalProfile: {
          primaryTechStack: shortlistedCandidate.techStack,
          experience: shortlistedCandidate.experience,
          skills: shortlistedCandidate.candidateId.profile?.skills || [],
          allTechFromProfile: shortlistedCandidate.candidateId.profile?.techStack || [],
          projects: (shortlistedCandidate.applicationId.projects || []).map(project => ({
            name: project.name,
            description: project.description,
            githubLink: project.githubLink,
            liveLink: project.liveLink,
            techUsed: project.techUsed,
            aiAnalysis: project.aiAnalysis || null
          }))
        },
        
        // Recruiter Information
        recruiterInfo: {
          name: shortlistedCandidate.recruiterId.name,
          email: shortlistedCandidate.recruiterId.email
        },
        
        // Interview & Status Information
        interviewInfo: {
          status: shortlistedCandidate.interviewStatus,
          shortlistedAt: shortlistedCandidate.shortlistedAt,
          scheduledDate: shortlistedCandidate.scheduledInterviewDate,
          aiSessionId: shortlistedCandidate.aiInterviewSessionId,
          notes: shortlistedCandidate.notes,
          appliedAt: shortlistedCandidate.applicationId.appliedAt
        },
        
        // Match Analysis for AI (computed fields)
        matchAnalysis: {
          techStackMatch: calculateTechStackMatch(
            shortlistedCandidate.jobId.techStack || [],
            [...(shortlistedCandidate.techStack || []), ...(shortlistedCandidate.candidateId.profile?.techStack || [])]
          ),
          hasGithubProjects: (shortlistedCandidate.applicationId.projects || []).some(p => p.githubLink),
          totalProjects: (shortlistedCandidate.applicationId.projects || []).length,
          aiAnalyzedProjects: (shortlistedCandidate.applicationId.projects || []).filter(p => p.aiAnalysis?.status === 'completed').length
        },
        
        // Timestamps
        timestamps: {
          shortlistedAt: shortlistedCandidate.shortlistedAt,
          appliedAt: shortlistedCandidate.applicationId.appliedAt,
          lastUpdated: shortlistedCandidate.updatedAt || shortlistedCandidate.shortlistedAt,
          dataGeneratedAt: new Date()
        }
      }
    };

    res.json(aiFormattedResponse);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to calculate tech stack match percentage
function calculateTechStackMatch(jobTechStack, candidateTechStack) {
  if (!jobTechStack.length || !candidateTechStack.length) return 0;
  
  const jobTech = jobTechStack.map(tech => tech.toLowerCase());
  const candidateTech = candidateTechStack.map(tech => tech.toLowerCase());
  
  const matches = jobTech.filter(tech => 
    candidateTech.some(candidateTechItem => 
      candidateTechItem.includes(tech) || tech.includes(candidateTechItem)
    )
  );
  
  return Math.round((matches.length / jobTech.length) * 100);
}

// Bulk export shortlisted candidates for AI system
router.get('/export/ai-scheduling-data', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidates = await ShortlistedCandidate.find({ 
      recruiterId: req.user.userId 
    })
    .populate('candidateId', 'name email profile')
    .populate('jobId', 'title company location type requirements techStack')
    .populate('applicationId', 'techStack experience projects');

    const exportData = {
      exportedAt: new Date(),
      recruiterInfo: {
        recruiterId: req.user.userId
      },
      candidates: shortlistedCandidates.map(candidate => ({
        shortlistedId: candidate._id,
        candidateDetails: {
          candidateId: candidate.candidateId._id,
          name: candidate.candidateName,
          email: candidate.candidateEmail,
          phone: candidate.phoneNumber
        },
        jobDetails: {
          jobId: candidate.jobId._id,
          role: candidate.role,
          company: candidate.companyName,
          requirements: candidate.jobId.requirements,
          techStack: candidate.jobId.techStack
        },
        applicationDetails: {
          techStack: candidate.techStack,
          experience: candidate.experience,
          projects: candidate.applicationId?.projects || []
        },
        interviewDetails: {
          status: candidate.interviewStatus,
          scheduledDate: candidate.scheduledInterviewDate,
          sessionId: candidate.aiInterviewSessionId,
          notes: candidate.notes
        },
        timestamps: {
          shortlistedAt: candidate.shortlistedAt
        }
      }))
    };

    res.json(exportData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// API endpoint for AI system to fetch all candidates ready for scheduling
router.get('/api/ai-candidates', async (req, res) => {
  try {
    // This endpoint can be used by the AI system without authentication
    // You might want to add API key authentication here for security
    
    const pendingCandidates = await ShortlistedCandidate.find({ 
      interviewStatus: 'pending'
    })
    .populate('candidateId', 'name email profile')
    .populate('jobId', 'title company location type requirements techStack salary')
    .populate('applicationId', 'appliedAt techStack experience projects')
    .populate('recruiterId', 'name email')
    .sort({ shortlistedAt: -1 });

    // Format data specifically for AI scheduling system
    const aiFormattedData = pendingCandidates.map(candidate => ({
      // Basic identifiers
      id: candidate._id,
      candidateId: candidate.candidateId._id,
      
      // Personal information
      candidateName: candidate.candidateName,
      candidateEmail: candidate.candidateEmail,
      phoneNumber: candidate.phoneNumber,
      
      // Job information
      companyName: candidate.companyName,
      role: candidate.role,
      jobId: candidate.jobId._id,
      jobRequirements: candidate.jobId.requirements,
      jobTechStack: candidate.jobId.techStack,
      jobSalary: candidate.jobId.salary,
      
      // Candidate technical details
      candidateTechStack: candidate.techStack,
      candidateExperience: candidate.experience,
      candidateProjects: candidate.applicationId?.projects || [],
      
      // Recruiter information
      recruiterName: candidate.recruiterId?.name,
      recruiterEmail: candidate.recruiterId?.email,
      recruiterId: candidate.recruiterId?._id,
      
      // Timing information
      shortlistedAt: candidate.shortlistedAt,
      
      // Status
      interviewStatus: candidate.interviewStatus
    }));

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalCandidates: aiFormattedData.length,
      candidates: aiFormattedData
    });
  } catch (err) {
    console.error('AI API Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch candidates for AI scheduling',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
});

// Get AI-formatted JSON for a specific candidate (clean format for AI consumption)
router.get('/:id/ai-format', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidate = await ShortlistedCandidate.findById(req.params.id)
      .populate('candidateId', 'name email profile')
      .populate('jobId', 'title company location type description requirements techStack salary')
      .populate('applicationId', 'appliedAt techStack experience projects resume coverLetter')
      .populate('recruiterId', 'name email');

    if (!shortlistedCandidate) {
      return res.status(404).json({ message: 'Shortlisted candidate not found' });
    }

    if (shortlistedCandidate.recruiterId._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Return only the AI-formatted data for cleaner consumption
    const aiData = {
      candidateId: shortlistedCandidate.candidateId._id,
      name: shortlistedCandidate.candidateName,
      email: shortlistedCandidate.candidateEmail,
      phone: shortlistedCandidate.phoneNumber,
      role: shortlistedCandidate.role,
      company: shortlistedCandidate.companyName,
      
      technicalProfile: {
        experience: shortlistedCandidate.experience,
        primarySkills: shortlistedCandidate.techStack,
        jobRequiredSkills: shortlistedCandidate.jobId.techStack,
        skillMatchPercentage: calculateTechStackMatch(
          shortlistedCandidate.jobId.techStack || [],
          [...(shortlistedCandidate.techStack || []), ...(shortlistedCandidate.candidateId.profile?.techStack || [])]
        ),
        projects: (shortlistedCandidate.applicationId.projects || []).map(project => ({
          name: project.name,
          description: project.description,
          technologies: project.techUsed,
          githubUrl: project.githubLink,
          aiCodeAnalysis: project.aiAnalysis?.status === 'completed' ? {
            humanCodePercentage: project.aiAnalysis.summary?.human_percentage || 0,
            aiCodePercentage: project.aiAnalysis.summary?.ai_percentage || 0,
            confidence: project.aiAnalysis.summary?.avg_confidence || 0,
            totalLines: project.aiAnalysis.summary?.total_lines || 0
          } : null
        }))
      },
      
      jobDetails: {
        title: shortlistedCandidate.jobId.title,
        description: shortlistedCandidate.jobId.description,
        requirements: shortlistedCandidate.jobId.requirements,
        salary: shortlistedCandidate.jobId.salary,
        type: shortlistedCandidate.jobId.type
      },
      
      interviewScheduling: {
        status: shortlistedCandidate.interviewStatus,
        shortlistedDate: shortlistedCandidate.shortlistedAt,
        scheduledDate: shortlistedCandidate.scheduledInterviewDate,
        recruiterNotes: shortlistedCandidate.notes,
        aiSessionId: shortlistedCandidate.aiInterviewSessionId
      },
      
      metadata: {
        shortlistedId: shortlistedCandidate._id,
        recruiterName: shortlistedCandidate.recruiterId.name,
        dataExportedAt: new Date().toISOString()
      }
    };

    res.json(aiData);
  } catch (err) {
    console.error('AI Format Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete shortlisted candidate record (if needed)
router.delete('/:id', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidate = await ShortlistedCandidate.findById(req.params.id);

    if (!shortlistedCandidate) {
      return res.status(404).json({ message: 'Shortlisted candidate not found' });
    }

    if (shortlistedCandidate.recruiterId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await ShortlistedCandidate.findByIdAndDelete(req.params.id);

    res.json({ message: 'Shortlisted candidate record deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;