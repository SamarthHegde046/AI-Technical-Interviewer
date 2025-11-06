// pages/ShortlistedCandidates.js
import { useEffect, useState } from 'react';
import { shortlistedAPI } from '../utils/api';

const ShortlistedCandidates = () => {
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [callingCandidate, setCallingCandidate] = useState(null);


  useEffect(() => {
    // Check if user is authenticated
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

  const testAICallerConnection = async () => {
    try {
      setMessage({ type: 'info', text: 'Testing AI caller service connection...' });
      
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://ai-technical-interviewer.onrender.com/api'
        : 'http://localhost:5000/api';

      const response = await fetch(`${backendUrl}/ai-caller/make-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          candidate_id: 'test-candidate-id'
        })
      });

      const result = await response.json();
      
      if (result.status === 'error' && result.message === 'candidate_id is required') {
        setMessage({ type: 'success', text: 'AI caller service proxy is working! ✅' });
      } else if (result.status === 'error') {
        setMessage({ type: 'warning', text: `AI service responded: ${result.message}` });
      } else {
        setMessage({ type: 'success', text: 'AI caller service is responding! ✅' });
      }
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: `AI service test failed: ${err.message}. Check console for details.` 
      });
      console.error('AI Caller Test Error:', err);
    }
  };



  const handleStartInterviewCall = async (candidate) => {
    try {
      setCallingCandidate(candidate._id);
      setMessage({ type: 'info', text: `Initiating AI interview call for ${candidate.candidateName}...` });
      
      // First try using the backend proxy to avoid CORS issues
      const backendUrl = process.env.NODE_ENV === 'production' 
        ? 'https://ai-technical-interviewer.onrender.com/api'
        : 'http://localhost:5000/api';
      
      let aiCallResponse;
      
      try {
        // Primary method: Use backend proxy
        aiCallResponse = await fetch(`${backendUrl}/ai-caller/make-call`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            candidate_id: candidate._id
          })
        });
      } catch (proxyError) {
        console.warn('Backend proxy failed, trying direct call:', proxyError);
        
        // Fallback method: Direct call to AI service (may fail due to CORS)
        const aiCallerUrl = process.env.REACT_APP_AI_CALLER_URL || 'https://ai-interview-caller.vercel.app';
        
        aiCallResponse = await fetch(`${aiCallerUrl}/make-actual-call`, {
          method: 'POST',
          mode: 'cors',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            candidate_id: candidate._id
          })
        });
      }

      const aiCallResult = await aiCallResponse.json();
      
      console.log('AI call result:', aiCallResult);

      // Handle error responses
      if (!aiCallResponse.ok || aiCallResult.status === 'error') {
        throw new Error(aiCallResult.message || `AI call failed with status: ${aiCallResponse.status}`);
      }

      // Handle successful response
      await updateInterviewStatus(candidate._id, 'scheduled', {
        scheduledInterviewDate: new Date().toISOString(),
        notes: 'AI interview call initiated successfully',
        aiInterviewSessionId: aiCallResult.call_sid || aiCallResult.session_id || Date.now().toString()
      });

      setMessage({ 
        type: 'success', 
        text: `AI interview call initiated successfully for ${candidate.candidateName}! Call ID: ${aiCallResult.call_sid || aiCallResult.session_id}` 
      });
    } catch (err) {
      console.error('Error initiating AI interview call:', err);
      
      let errorMessage = `Failed to initiate AI interview for ${candidate.candidateName}`;
      
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        errorMessage += ': Network connection failed. Please check your internet connection and try again.';
      } else if (err.message.includes('CORS')) {
        errorMessage += ': CORS policy error. Using backend proxy should resolve this issue.';
      } else if (err.message.includes('timeout')) {
        errorMessage += ': Request timeout. The AI caller service may be experiencing high load.';
      } else if (err.message.includes('404')) {
        errorMessage += ': AI caller service endpoint not found. Please check service availability.';
      } else if (err.message.includes('500')) {
        errorMessage += ': AI caller service internal error. Please try again later.';
      } else {
        errorMessage += `: ${err.message}`;
      }
      
      setMessage({ 
        type: 'error', 
        text: errorMessage
      });
    } finally {
      setCallingCandidate(null);
    }
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading shortlisted candidates...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Shortlisted Candidates</h1>
        <div className="flex gap-2">
          <button
            onClick={testAICallerConnection}
            className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 text-sm"
          >
            Test AI Service
          </button>
          <button
            onClick={fetchShortlistedCandidates}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-6 p-4 rounded ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {shortlistedCandidates.length === 0 && !message.text ? (
        <div className="text-center py-12">
          <div className="max-w-2xl mx-auto">
            <p className="text-xl text-gray-600 mb-4">No shortlisted candidates available.</p>
            <div className="bg-blue-50 p-6 rounded-lg text-left">
              <h3 className="font-semibold text-blue-800 mb-3">How the shortlisting feature works:</h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-700">
                <li>Recruiters review job applications</li>
                <li>Change promising application status to "shortlisted"</li>
                <li>Shortlisted candidates appear here for AI interview scheduling</li>
                <li>AI system can access structured candidate data for automated interviews</li>
              </ol>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          {shortlistedCandidates.map((candidate) => (
            <div key={candidate._id} className="bg-white rounded-lg shadow-md p-6 border">
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
                  <p className="font-semibold text-gray-700">Position:</p>
                  <p>{candidate.role} at {candidate.companyName}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Experience:</p>
                  <p>{candidate.experience}</p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Tech Stack:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {candidate.techStack.map((tech, index) => (
                      <span key={index} className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-gray-700">Shortlisted:</p>
                  <p>{new Date(candidate.shortlistedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Interview Status Information */}
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-semibold text-gray-800">Interview Status:</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-1 rounded text-sm ${getStatusColor(candidate.interviewStatus)}`}>
                    {candidate.interviewStatus.charAt(0).toUpperCase() + candidate.interviewStatus.slice(1)}
                  </span>
                  {candidate.scheduledInterviewDate && (
                    <span className="text-sm text-gray-600">
                      Scheduled: {new Date(candidate.scheduledInterviewDate).toLocaleString()}
                    </span>
                  )}
                </div>
                {candidate.notes && (
                  <p className="text-gray-600 mt-2 text-sm">Notes: {candidate.notes}</p>
                )}
                {candidate.aiInterviewSessionId && (
                  <p className="text-gray-500 mt-1 text-xs">Session ID: {candidate.aiInterviewSessionId}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {candidate.interviewStatus === 'pending' && (
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
                        <span className="animate-spin">⏳</span> Calling...
                      </>
                    ) : (
                      <>
                        📞 Start AI Interview Call
                      </>
                    )}
                  </button>
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
  );
};

export default ShortlistedCandidates;