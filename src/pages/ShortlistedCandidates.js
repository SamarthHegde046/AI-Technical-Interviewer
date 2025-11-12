import { useEffect, useState } from 'react';
import { shortlistedAPI } from '../utils/api';

// Centralized API configuration - Production URLs only
const API_CONFIG = {
  BACKEND_URL: 'https://ai-technical-interviewer.onrender.com/api',
  AI_CALLER_URL: 'https://ai-interview-caller.vercel.app'
};

const ShortlistedCandidates = () => {
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [callingCandidate, setCallingCandidate] = useState(null);
  const [callTimeout, setCallTimeout] = useState(0);
  const [sendingEmail, setSendingEmail] = useState(null);
  
  // Interview state - fetched from DB after AI scheduling
  const [fetchingSchedule, setFetchingSchedule] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      setMessage({ type: 'error', text: 'Please log in as a recruiter to view shortlisted candidates' });
      setLoading(false);
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== 'recruiter') {
      setMessage({ type: 'error', text: 'Only recruiters can view shortlisted candidates' });
      setLoading(false);
      return;
    }

    fetchShortlistedCandidates();
  }, []);

  const fetchShortlistedCandidates = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      const response = await shortlistedAPI.getAllShortlisted();
      const candidates = response.data?.shortlistedCandidates || response.data || [];
      setShortlistedCandidates(candidates);
      
      if (candidates.length > 0) {
        setMessage({ type: 'success', text: `Loaded ${candidates.length} shortlisted candidates` });
      } else {
        setMessage({ type: 'info', text: 'No shortlisted candidates found. Shortlist some applications first.' });
      }
      
    } catch (err) {
      console.error('Error fetching shortlisted candidates:', err);
      
      let errorMessage = 'Failed to load shortlisted candidates';
      
      if (err.response?.status === 401) {
        errorMessage = 'Please log in as a recruiter to view shortlisted candidates.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
      setShortlistedCandidates([]);
    } finally {
      setLoading(false);
    }
  };

  const updateInterviewStatus = async (candidateId, status, data = {}) => {
    try {
      await shortlistedAPI.updateInterviewStatus(candidateId, {
        interviewStatus: status,
        ...data
      });
      
      setMessage({ type: 'success', text: `Interview status updated to ${status}` });
      fetchShortlistedCandidates();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update interview status' });
    }
  };

  const handleMigration = async () => {
    try {
      setLoading(true);
      setMessage({ type: 'info', text: 'Migrating existing shortlisted applications...' });
      
      const response = await shortlistedAPI.migrateExisting();
      
      if (response.data.migratedCount > 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully migrated ${response.data.migratedCount} shortlisted applications! ${response.data.skippedCount > 0 ? `(${response.data.skippedCount} already existed)` : ''}` 
        });
        fetchShortlistedCandidates();
      } else if (response.data.totalFound === 0) {
        setMessage({ 
          type: 'info', 
          text: 'No shortlisted applications found to migrate. Mark some applications as "shortlisted" in your dashboard first.' 
        });
      } else {
        setMessage({ 
          type: 'info', 
          text: `All ${response.data.totalFound} shortlisted applications were already migrated.` 
        });
      }
    } catch (err) {
      console.error('Migration error:', err);
      setMessage({ 
        type: 'error', 
        text: 'Failed to migrate existing applications. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartInterviewCall = async (candidate, retryCount = 0) => {
    const maxRetries = 2;
    let timerInterval = null;
    
    try {
      setCallingCandidate(candidate._id);
      setCallTimeout(0);
      
      // Start countdown timer
      timerInterval = setInterval(() => {
        setCallTimeout(prev => prev + 1);
      }, 1000);
      
      if (retryCount === 0) {
        setMessage({ 
          type: 'info', 
          text: `Initiating AI interview call for ${candidate.candidateName}... This may take up to 60 seconds.` 
        });
      } else {
        setMessage({ 
          type: 'info', 
          text: `Retrying AI interview call for ${candidate.candidateName}... (Attempt ${retryCount + 1}/${maxRetries + 1})` 
        });
      }
      
      // Use deployed backend for AI caller proxy
      const backendUrl = API_CONFIG.BACKEND_URL;
      
      let aiCallResponse;
      
      try {
        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 65000); // 65 second timeout
        
        aiCallResponse = await fetch(`${backendUrl}/ai-caller/make-call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            candidate_id: candidate._id
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
      } catch (proxyError) {
        console.warn('Backend proxy failed:', proxyError);
        
        // If it's a timeout and we haven't exceeded retries, try again
        if ((proxyError.name === 'AbortError' || proxyError.message.includes('timeout')) && retryCount < maxRetries) {
          console.log(`Timeout occurred, retrying... (${retryCount + 1}/${maxRetries})`);
          return handleStartInterviewCall(candidate, retryCount + 1);
        }
        
        // Try direct call as fallback
        const aiCallerUrl = process.env.REACT_APP_AI_CALLER_URL || API_CONFIG.AI_CALLER_URL;
        
        const directController = new AbortController();
        const directTimeoutId = setTimeout(() => directController.abort(), 65000);
        
        aiCallResponse = await fetch(`${aiCallerUrl}/make-actual-call`, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            candidate_id: candidate._id
          }),
          signal: directController.signal
        });
        
        clearTimeout(directTimeoutId);
      }

      const aiCallResult = await aiCallResponse.json();
      
      console.log('AI call result:', aiCallResult);

      if (!aiCallResponse.ok || aiCallResult.status === 'error') {
        // Handle specific error cases with better messaging
        if (aiCallResponse.status === 504 || aiCallResult.error === 'Request timeout') {
          if (retryCount < maxRetries) {
            console.log(`Request timed out, retrying... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
            return handleStartInterviewCall(candidate, retryCount + 1);
          } else {
            throw new Error(`Service timeout after ${maxRetries + 1} attempts. ${aiCallResult.suggestion || 'Please try again later.'}`);
          }
        }
        
        throw new Error(aiCallResult.message || aiCallResult.suggestion || `AI call failed with status: ${aiCallResponse.status}`);
      }

      // Update status to "calling" instead of "scheduled"
      await updateInterviewStatus(candidate._id, 'calling', {
        notes: `AI interview call initiated on ${new Date().toLocaleString()}`,
        aiInterviewSessionId: aiCallResult.call_sid || aiCallResult.session_id || Date.now().toString(),
        lastCallDate: new Date().toISOString()
      });

      setMessage({ 
        type: 'success', 
        text: `📞 AI interview call initiated for ${candidate.candidateName}! The system will update the status based on candidate response. Call ID: ${aiCallResult.call_sid || aiCallResult.session_id}` 
      });

      // Start polling for status updates every 30 seconds
      const pollInterval = setInterval(async () => {
        try {
          const updatedCandidate = await shortlistedAPI.getShortlistedById(candidate._id);
          const currentCandidate = shortlistedCandidates.find(c => c._id === candidate._id);
          
          if (updatedCandidate.data && currentCandidate && 
              updatedCandidate.data.interviewStatus !== currentCandidate.interviewStatus) {
            
            // Update the local state
            setShortlistedCandidates(prev => 
              prev.map(c => c._id === candidate._id ? updatedCandidate.data : c)
            );
            
            // Show status update message
            setMessage({ 
              type: 'info', 
              text: `📋 Status updated for ${candidate.candidateName}: ${updatedCandidate.data.interviewStatus}` 
            });
            
            // Stop polling if status is no longer "calling"
            if (updatedCandidate.data.interviewStatus !== 'calling') {
              clearInterval(pollInterval);
            }
          }
        } catch (error) {
          console.error('Error polling status:', error);
        }
      }, 30000); // Poll every 30 seconds

      // Stop polling after 10 minutes max
      setTimeout(() => clearInterval(pollInterval), 600000);
    } catch (err) {
      console.error('Error initiating AI interview call:', err);
      
      let errorMessage = `Failed to initiate AI interview for ${candidate.candidateName}`;
      let suggestion = '';
      
      if (err.name === 'AbortError') {
        errorMessage += ': Request timed out after 65 seconds.';
        suggestion = ' The AI service may be experiencing high load. Please try again in a few minutes.';
      } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        errorMessage += ': Network connection failed.';
        suggestion = ' Please check your internet connection and try again.';
      } else if (err.message.includes('CORS')) {
        errorMessage += ': Cross-origin request blocked.';
        suggestion = ' This should be handled by the backend proxy.';
      } else if (err.message.includes('timeout')) {
        errorMessage += ': Service timeout.';
        suggestion = ' The AI caller service may be busy. Please try again in a few minutes.';
      } else if (err.message.includes('404')) {
        errorMessage += ': Service endpoint not found.';
        suggestion = ' Please contact support.';
      } else if (err.message.includes('503') || err.message.includes('unavailable')) {
        errorMessage += ': Service temporarily unavailable.';
        suggestion = ' Please try again in a few minutes.';
      } else if (err.message.includes('500')) {
        errorMessage += ': Internal service error.';
        suggestion = ' Please try again later or contact support.';
      } else {
        errorMessage += `: ${err.message}`;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage + suggestion
      });
    } finally {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      setCallingCandidate(null);
      setCallTimeout(0);
    }
  };

  // Fetch scheduled interview from database
  const fetchScheduledInterview = async (candidateId) => {
    try {
      setFetchingSchedule(candidateId);
      
      const backendUrl = API_CONFIG.BACKEND_URL;
      const response = await fetch(`${backendUrl}/scheduled-sessions/candidate/${candidateId}`);
      
      if (response.ok) {
        const scheduledSession = await response.json();
        return scheduledSession;
      } else {
        console.log('No scheduled interview found for candidate');
        return null;
      }
    } catch (error) {
      console.error('Error fetching scheduled interview:', error);
      return null;
    } finally {
      setFetchingSchedule(null);
    }
  };



  const handleSendSessionEmail = async (candidate) => {
    try {
      setSendingEmail(candidate._id);
      setMessage({ 
        type: 'info', 
        text: `Checking for scheduled interview and sending session URL to ${candidate.candidateName}...` 
      });

      // First check if there's a scheduled interview from AI calling system
      const scheduledInterview = await fetchScheduledInterview(candidate._id);
      
      if (!scheduledInterview) {
        setMessage({
          type: 'error',
          text: 'No scheduled interview found. Please ensure the AI calling system has scheduled an interview first.'
        });
        setSendingEmail(null);
        return;
      }

      // USE DEPLOYED BACKEND URL
      const backendUrl = API_CONFIG.BACKEND_URL;
      
      // Debug logging to verify URL
      console.log('🔍 DEBUG: Using backend URL:', backendUrl);
      console.log('🔍 DEBUG: Full email URL:', `${backendUrl}/email/send-candidate-session`);
      console.log('🔍 DEBUG: Candidate ID:', candidate._id);
      console.log('🔍 DEBUG: Timestamp:', new Date().toISOString());

      console.log('🚀 DEBUG: Making POST request...');
      
      const requestPayload = {
        candidateId: candidate._id,
        recruiterEmail: JSON.parse(localStorage.getItem('user') || '{}').email || 'recruiter@company.com',
        message: `Interview session scheduled for ${scheduledInterview.scheduledDate} at ${scheduledInterview.scheduledTime}`,
        scheduledInterview: {
          date: scheduledInterview.scheduledDate,
          time: scheduledInterview.scheduledTime,
          duration: scheduledInterview.duration,
          type: scheduledInterview.interviewType,
          notes: scheduledInterview.notes
        }
      };
      
      console.log('📤 DEBUG: Request payload:', requestPayload);

      const response = await fetch(`${backendUrl}/email/send-candidate-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(requestPayload),
      });

      console.log('📥 DEBUG: Response status:', response.status);
      console.log('📥 DEBUG: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DEBUG: Error response:', errorText);
        console.error('❌ DEBUG: Response status:', response.status);
        console.error('❌ DEBUG: Response URL:', response.url);
        
        // Check if it's an HTML error page
        if (errorText.includes('<!DOCTYPE') || errorText.includes('<html>')) {
          console.error('🚨 SERVER RETURNED HTML INSTEAD OF JSON!');
          console.error('🚨 This usually means:');
          console.error('   - Wrong HTTP method (GET instead of POST)');
          console.error('   - Wrong URL/endpoint');
          console.error('   - Server error or crash');
          throw new Error(`Server returned HTML error page (Status: ${response.status}). Check browser Network tab for details.`);
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ DEBUG: Success response:', result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to send email');
      }

      // Update candidate status to indicate email was sent
      await updateInterviewStatus(candidate._id, 'email_sent', {
        notes: `Session URL sent via email on ${new Date().toLocaleString()}`,
        sessionUrl: result.data.sessionUrl,
        lastEmailDate: new Date().toISOString()
      });

      setMessage({ 
        type: 'success', 
        text: `📧 Session URL sent successfully to ${candidate.candidateName} (${candidate.candidateEmail})! They can now access their interview session.` 
      });

    } catch (err) {
      console.error('Error sending session email:', err);
      
      let errorMessage = `Failed to send session URL to ${candidate.candidateName}`;
      
      if (err.message.includes('not found')) {
        errorMessage += ': Candidate not found in system.';
      } else if (err.message.includes('email not found')) {
        errorMessage += ': No email address available for candidate.';
      } else if (err.message.includes('Network')) {
        errorMessage += ': Network connection failed.';
      } else {
        errorMessage += `: ${err.message}`;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setSendingEmail(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'shortlisted': return 'bg-blue-100 text-blue-800';
      case 'email_sent': return 'bg-cyan-100 text-cyan-800';
      case 'calling': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-green-100 text-green-800';
      case 'call_completed': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'declined': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow border p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shortlisted Candidates</h1>
              <p className="text-gray-600 mt-1">Manage candidates you've shortlisted for AI interviews</p>
            </div>
            <button
              onClick={fetchShortlistedCandidates}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : message.type === 'info' 
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Content */}
        {shortlistedCandidates.length === 0 && !message.text ? (
          <div className="bg-white rounded-lg shadow border p-8">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Shortlisted Candidates</h3>
              <p className="text-gray-600 mb-6">Start by shortlisting promising applications from your dashboard.</p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
                <button
                  onClick={handleMigration}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  disabled={loading}
                >
                  {loading ? 'Checking...' : 'Sync Existing Applications'}
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await shortlistedAPI.debug();
                      console.log('Debug info:', response.data);
                      setMessage({ 
                        type: 'info', 
                        text: `Debug: Found ${response.data.totalApplications} total applications, ${response.data.shortlistedApplications.length} shortlisted applications, ${response.data.shortlistedCandidatesCollection} in shortlisted collection. Check console for details.` 
                      });
                    } catch (err) {
                      console.error('Debug error:', err);
                      setMessage({ type: 'error', text: 'Debug failed. Check console.' });
                    }
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm"
                  disabled={loading}
                >
                  Debug Info
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Review applications in your dashboard</li>
                  <li>Change status to "shortlisted" for promising candidates</li>
                  <li>Schedule AI interviews from this page</li>
                </ol>
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs text-blue-700">
                    💡 Click "Sync Existing Applications" if you already have shortlisted applications
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {shortlistedCandidates.map((candidate) => (
            <div key={candidate._id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-blue-600">{candidate.candidateName}</h3>
                  <p className="text-gray-600">{candidate.candidateEmail}</p>
                  <p className="text-gray-600">{candidate.phoneNumber}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(candidate.interviewStatus)}`}>
                  {candidate.interviewStatus.charAt(0).toUpperCase() + candidate.interviewStatus.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Position</p>
                  <p className="text-gray-900">{candidate.role} at {candidate.companyName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Experience</p>
                  <p className="text-gray-900">{candidate.experience}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500 mb-2">Tech Stack</p>
                  <div className="flex flex-wrap gap-1">
                    {candidate.techStack?.map((tech, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-500">Interview Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.interviewStatus)}`}>
                    {candidate.interviewStatus.charAt(0).toUpperCase() + candidate.interviewStatus.slice(1)}
                  </span>
                </div>
                {candidate.scheduledInterviewDate && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Scheduled:</span> {new Date(candidate.scheduledInterviewDate).toLocaleString()}
                  </div>
                )}
                {candidate.notes && (
                  <div className="text-xs text-gray-600 mb-1">
                    <span className="font-medium">Notes:</span> {candidate.notes}
                  </div>
                )}
                {candidate.aiInterviewSessionId && (
                  <div className="text-xs text-gray-500">
                    <span className="font-medium">Session ID:</span> {candidate.aiInterviewSessionId}
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
                  Shortlisted: {new Date(candidate.shortlistedAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(candidate.interviewStatus === 'pending' || candidate.interviewStatus === 'shortlisted') && (
                  <>
                    <button
                      onClick={() => handleStartInterviewCall(candidate)}
                      disabled={callingCandidate === candidate._id}
                      className={`px-4 py-2 rounded flex items-center gap-2 ${
                        callingCandidate === candidate._id
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {callingCandidate === candidate._id ? (
                        <>
                          <span className="animate-spin">⏳</span> 
                          Calling... {callTimeout > 0 && `(${callTimeout}s)`}
                        </>
                      ) : (
                        <>
                          📞 Start AI Interview Call
                        </>
                      )}
                    </button>
                  </>
                )}

                {/* Send Session URL Button - Show for scheduled candidates */}
                {(candidate.interviewStatus === 'scheduled' || candidate.interviewStatus === 'pending' || candidate.interviewStatus === 'shortlisted') && (
                  <button
                    onClick={() => handleSendSessionEmail(candidate)}
                    disabled={sendingEmail === candidate._id || fetchingSchedule === candidate._id}
                    className={`px-4 py-2 rounded flex items-center gap-2 ${
                      (sendingEmail === candidate._id || fetchingSchedule === candidate._id)
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {sendingEmail === candidate._id ? (
                      <>
                        <span className="animate-spin">⏳</span> 
                        Sending Email...
                      </>
                    ) : fetchingSchedule === candidate._id ? (
                      <>
                        <span className="animate-spin">⏳</span> 
                        Checking Schedule...
                      </>
                    ) : (
                      <>
                        📧 Send Session URL
                      </>
                    )}
                  </button>
                )}

                {callingCandidate === candidate._id && callTimeout > 30 && (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 flex items-center">
                    ⚠️ Call taking longer than expected. AI service may be busy.
                  </div>
                )}
                
                {candidate.interviewStatus === 'email_sent' && (
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-600">📧 Session URL sent</span>
                    <button
                      onClick={() => handleSendSessionEmail(candidate)}
                      disabled={sendingEmail === candidate._id}
                      className={`px-3 py-1 text-sm rounded ${
                        sendingEmail === candidate._id
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {sendingEmail === candidate._id ? 'Sending...' : 'Resend Email'}
                    </button>
                  </div>
                )}
                
                {candidate.interviewStatus === 'calling' && (
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse text-yellow-600">📞 Call in progress...</span>
                    <span className="text-xs text-gray-500">Waiting for candidate response</span>
                    <button
                      onClick={() => handleSendSessionEmail(candidate)}
                      disabled={sendingEmail === candidate._id}
                      className={`px-3 py-1 text-sm rounded ${
                        sendingEmail === candidate._id
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {sendingEmail === candidate._id ? 'Sending...' : '📧 Send URL'}
                    </button>
                  </div>
                )}
                
                {candidate.interviewStatus === 'call_completed' && (
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600">✅ Call completed</span>
                    <span className="text-xs text-gray-500">Awaiting interview scheduling</span>
                    <button
                      onClick={() => handleSendSessionEmail(candidate)}
                      disabled={sendingEmail === candidate._id}
                      className={`px-3 py-1 text-sm rounded ${
                        sendingEmail === candidate._id
                          ? 'bg-gray-400 text-white cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {sendingEmail === candidate._id ? 'Sending...' : '📧 Send URL'}
                    </button>
                  </div>
                )}
                
                {candidate.interviewStatus === 'declined' && (
                  <div className="flex items-center gap-2">
                    <span className="text-orange-600">❌ Candidate declined</span>
                    <button
                      onClick={() => handleStartInterviewCall(candidate)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      Try Again
                    </button>
                  </div>
                )}
                
                {candidate.interviewStatus === 'scheduled' && (
                  <>
                    <button
                      onClick={() => updateInterviewStatus(candidate._id, 'completed')}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => updateInterviewStatus(candidate._id, 'cancelled')}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Cancel Interview
                    </button>
                  </>
                )}

                {(candidate.interviewStatus === 'completed' || candidate.interviewStatus === 'cancelled') && (
                  <button
                    onClick={() => updateInterviewStatus(candidate._id, 'pending')}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                  >
                    Reset Status
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>


    </div>
  );
};

export default ShortlistedCandidates;