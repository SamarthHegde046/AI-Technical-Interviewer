const express = require('express');
const router = express.Router();
const ShortlistedCandidate = require('../models/ShortlistedCandidate');
const { auth, isRecruiter } = require('../middleware/auth');

// Get all shortlisted candidates for the recruiter
router.get('/', auth, isRecruiter, async (req, res) => {
  try {
    console.log('Fetching shortlisted candidates for recruiter:', req.user.userId);
    
    const shortlistedCandidates = await ShortlistedCandidate.find({
      recruiterId: req.user.userId
    })
      .populate('candidateId', 'name email phone skills experience')
      .populate('applicationId', 'status appliedAt')
      .populate('jobId', 'title company location')
      .sort({ shortlistedAt: -1 });
    
    console.log('Found shortlisted candidates:', shortlistedCandidates.length);
    
    // Auto-sync status for candidates with call tracking data
    let autoSyncCount = 0;
    for (const candidate of shortlistedCandidates) {
      if (candidate.call_tracking?.status) {
        const callTrackingStatus = candidate.call_tracking.status;
        let needsUpdate = false;
        
        if (callTrackingStatus === 'interview_scheduled' && candidate.interviewStatus !== 'scheduled') {
          candidate.interviewStatus = 'scheduled';
          if (candidate.call_tracking?.interview_details?.scheduled_at) {
            candidate.scheduledInterviewDate = new Date(candidate.call_tracking.interview_details.scheduled_at);
          }
          if (candidate.call_tracking?.interview_details?.scheduled_slot) {
            candidate.notes = `Interview scheduled for ${candidate.call_tracking.interview_details.scheduled_slot}. Email confirmation sent.`;
          }
          needsUpdate = true;
        } else if (callTrackingStatus === 'declined' && candidate.interviewStatus !== 'declined') {
          candidate.interviewStatus = 'declined';
          needsUpdate = true;
        } else if (callTrackingStatus === 'completed' && candidate.interviewStatus !== 'call_completed') {
          candidate.interviewStatus = 'call_completed';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          console.log(`Auto-syncing ${candidate.candidateName}: ${callTrackingStatus} -> ${candidate.interviewStatus}`);
          await candidate.save();
          autoSyncCount++;
        }
      }
    }
    
    // Also check total count without recruiter filter for debugging
    const totalCount = await ShortlistedCandidate.countDocuments();
    console.log('Total shortlisted candidates in database:', totalCount);
    console.log('Auto-synced candidates:', autoSyncCount);
    
    res.json({ 
      shortlistedCandidates,
      success: true,
      autoSyncCount,
      debug: {
        recruiterId: req.user.userId,
        foundCount: shortlistedCandidates.length,
        totalCount: totalCount
      }
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

// Migrate existing shortlisted applications (one-time setup)
router.post('/migrate', auth, isRecruiter, async (req, res) => {
  try {
    const Application = require('../models/Application');
    const Job = require('../models/Job');
    
    console.log('Starting migration for recruiter:', req.user.userId);
    
    // Find all shortlisted applications for this recruiter's jobs
    const recruiterJobs = await Job.find({ recruiter: req.user.userId });
    const jobIds = recruiterJobs.map(job => job._id);
    
    console.log('Recruiter jobs found:', jobIds.length);
    
    const shortlistedApplications = await Application.find({
      job: { $in: jobIds },
      status: 'shortlisted'
    }).populate('job').populate('candidate');
    
    console.log('Shortlisted applications found:', shortlistedApplications.length);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const application of shortlistedApplications) {
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
          migratedCount++;
        } else {
          skippedCount++;
        }
      } catch (error) {
        console.error(`Error migrating application ${application._id}:`, error);
      }
    }

    res.json({
      message: 'Migration completed',
      migratedCount,
      skippedCount,
      totalFound: shortlistedApplications.length
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      message: 'Migration failed', 
      error: error.message 
    });
  }
});

// Update call status from AI service (webhook)
router.post('/:id/call-status', async (req, res) => {
  try {
    const { 
      callSid, 
      callStatus, 
      callDuration, 
      candidateResponse, 
      interviewScheduled,
      scheduledDate 
    } = req.body;
    
    const shortlistedCandidate = await ShortlistedCandidate.findById(req.params.id);

    if (!shortlistedCandidate) {
      return res.status(404).json({ message: 'Shortlisted candidate not found' });
    }

    // Update call tracking info
    shortlistedCandidate.callSid = callSid;
    shortlistedCandidate.callStatus = callStatus;
    shortlistedCandidate.callDuration = callDuration;
    shortlistedCandidate.candidateResponse = candidateResponse;
    shortlistedCandidate.lastCallDate = new Date();

    // Update interview status based on candidate response
    if (candidateResponse === 'accepted' && interviewScheduled) {
      shortlistedCandidate.interviewStatus = 'scheduled';
      shortlistedCandidate.scheduledInterviewDate = scheduledDate ? new Date(scheduledDate) : new Date();
      shortlistedCandidate.notes = `Interview scheduled - candidate accepted via AI call on ${new Date().toLocaleString()}`;
    } else if (candidateResponse === 'declined') {
      shortlistedCandidate.interviewStatus = 'declined';
      shortlistedCandidate.notes = `Candidate declined interview via AI call on ${new Date().toLocaleString()}`;
    } else if (candidateResponse === 'no_answer' || candidateResponse === 'busy') {
      shortlistedCandidate.interviewStatus = 'call_completed';
      shortlistedCandidate.notes = `Call ${candidateResponse} on ${new Date().toLocaleString()}. May need follow-up.`;
    } else {
      shortlistedCandidate.interviewStatus = 'call_completed';
      shortlistedCandidate.notes = `Call completed on ${new Date().toLocaleString()}. Status: ${callStatus}`;
    }

    await shortlistedCandidate.save();

    res.json({ 
      message: 'Call status updated successfully', 
      shortlistedCandidate 
    });
  } catch (err) {
    console.error('Call status update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single shortlisted candidate by ID
router.get('/:id', auth, isRecruiter, async (req, res) => {
  try {
    const shortlistedCandidate = await ShortlistedCandidate.findById(req.params.id);

    if (!shortlistedCandidate) {
      return res.status(404).json({ message: 'Shortlisted candidate not found' });
    }

    // Ensure the recruiter can only access their own shortlisted candidates
    if (shortlistedCandidate.recruiterId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Unauthorized access to shortlisted candidate' });
    }

    res.json(shortlistedCandidate);
  } catch (err) {
    console.error('Get shortlisted candidate error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update interview status
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

// Debug endpoint to see what's in the database
router.get('/debug', auth, isRecruiter, async (req, res) => {
  try {
    const Application = require('../models/Application');
    const Job = require('../models/Job');
    
    // Get recruiter's jobs
    const recruiterJobs = await Job.find({ recruiter: req.user.userId });
    const jobIds = recruiterJobs.map(job => job._id);
    
    // Get all applications for recruiter's jobs
    const allApplications = await Application.find({
      job: { $in: jobIds }
    }).populate('job', 'title').populate('candidate', 'name email');
    
    // Get shortlisted applications
    const shortlistedApplications = await Application.find({
      job: { $in: jobIds },
      status: 'shortlisted'
    }).populate('job', 'title').populate('candidate', 'name email');
    
    // Get shortlisted candidates from ShortlistedCandidate collection
    const shortlistedCandidates = await ShortlistedCandidate.find({
      recruiterId: req.user.userId
    });
    
    res.json({
      recruiterId: req.user.userId,
      recruiterJobs: recruiterJobs.length,
      totalApplications: allApplications.length,
      applicationsByStatus: allApplications.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {}),
      shortlistedApplications: shortlistedApplications.map(app => ({
        id: app._id,
        candidateName: app.candidateName,
        jobTitle: app.job?.title,
        status: app.status,
        appliedAt: app.appliedAt
      })),
      shortlistedCandidatesCollection: shortlistedCandidates.length
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync call tracking status to interview status (manual fix for disconnected status)
router.post('/sync-status', auth, isRecruiter, async (req, res) => {
  try {
    // First, find all candidates for this recruiter
    const allCandidates = await ShortlistedCandidate.find({
      recruiterId: req.user.userId
    });

    console.log(`Found ${allCandidates.length} total candidates for recruiter ${req.user.userId}`);
    
    const candidatesWithTracking = allCandidates.filter(c => c.call_tracking);
    console.log(`${candidatesWithTracking.length} candidates have call_tracking data`);
    
    // Debug: Log each candidate's status
    allCandidates.forEach(c => {
      console.log(`Candidate ${c.candidateName}: interview_status=${c.interviewStatus}, call_tracking_status=${c.call_tracking?.status || 'none'}`);
    });

    let updatedCount = 0;
    const updates = [];

    for (const candidate of candidatesWithTracking) {
      const oldStatus = candidate.interviewStatus;
      let needsUpdate = false;
      const callTrackingStatus = candidate.call_tracking?.status;
      
      if (callTrackingStatus === 'interview_scheduled' && candidate.interviewStatus !== 'scheduled') {
        candidate.interviewStatus = 'scheduled';
        
        if (candidate.call_tracking?.interview_details?.scheduled_at) {
          candidate.scheduledInterviewDate = new Date(candidate.call_tracking.interview_details.scheduled_at);
        }
        
        if (candidate.call_tracking?.interview_details?.scheduled_slot) {
          candidate.notes = `Interview scheduled for ${candidate.call_tracking.interview_details.scheduled_slot}. Email confirmation sent.`;
        }
        
        needsUpdate = true;
      } else if (callTrackingStatus === 'declined' && candidate.interviewStatus !== 'declined') {
        candidate.interviewStatus = 'declined';
        needsUpdate = true;
      } else if (callTrackingStatus === 'completed' && candidate.interviewStatus !== 'call_completed') {
        candidate.interviewStatus = 'call_completed';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        console.log(`Updating ${candidate.candidateName}: ${oldStatus} -> ${candidate.interviewStatus}`);
        await candidate.save();
        updatedCount++;
        updates.push({
          candidateName: candidate.candidateName,
          oldStatus: oldStatus,
          newStatus: candidate.interviewStatus,
          callTrackingStatus: callTrackingStatus
        });
      }
    }

    res.json({ 
      message: `Synced ${updatedCount} candidates`,
      updatedCount,
      updates
    });
  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;