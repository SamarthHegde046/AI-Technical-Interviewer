// pages/ShortlistedCandidates.js
import { useEffect, useState } from 'react';
import { shortlistedAPI } from '../utils/api';

const ShortlistedCandidates = () => {
  const [shortlistedCandidates, setShortlistedCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    scheduledInterviewDate: '',
    notes: ''
  });
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [candidateJson, setCandidateJson] = useState(null);

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
      
      if (showScheduleModal) {
        setShowScheduleModal(false);
        setSelectedCandidate(null);
        setScheduleForm({ scheduledInterviewDate: '', notes: '' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update interview status' });
    }
  };

  const handleScheduleInterview = (candidate) => {
    setSelectedCandidate(candidate);
    setShowScheduleModal(true);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Trigger AI interview call
      setMessage({ type: 'info', text: 'Initiating AI interview call...' });
      
      const aiCallResponse = await fetch('https://ai-interview-caller.vercel.app/make-actual-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          candidate_id: selectedCandidate.candidateId || selectedCandidate._id
        })
      });

      if (!aiCallResponse.ok) {
        throw new Error(`AI call failed with status: ${aiCallResponse.status}`);
      }

      const aiCallResult = await aiCallResponse.json();
      console.log('AI call result:', aiCallResult);

      // Update interview status to scheduled
      await updateInterviewStatus(selectedCandidate._id, 'scheduled', {
        scheduledInterviewDate: new Date().toISOString(), // Use current time
        notes: scheduleForm.notes,
        aiInterviewSessionId: aiCallResult.session_id || aiCallResult.call_id || Date.now().toString()
      });

      setMessage({ type: 'success', text: 'AI interview call initiated successfully!' });
    } catch (err) {
      console.error('Error initiating AI interview call:', err);
      setMessage({ 
        type: 'error', 
        text: `Failed to initiate AI interview: ${err.message}. You can still schedule manually.` 
      });
      
      // Still update status even if AI call fails
      await updateInterviewStatus(selectedCandidate._id, 'scheduled', {
        scheduledInterviewDate: new Date().toISOString(), // Use current time
        notes: scheduleForm.notes
      });
    }
  };

  const viewCandidateJson = async (candidateId, format = 'full') => {
    try {
      let response;
      if (format === 'ai') {
        response = await shortlistedAPI.getCandidateAIFormat(candidateId);
      } else {
        response = await shortlistedAPI.getCandidate(candidateId);
      }
      setCandidateJson({ ...response.data, format });
      setShowJsonModal(true);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load candidate details' });
    }
  };

  const downloadCandidateJson = (jsonData) => {
    const candidateName = jsonData.candidateName || jsonData.name || 'candidate';
    const format = jsonData.format || 'full';
    const filename = `${candidateName.replace(/\s+/g, '_')}_${format}_details.json`;
    
    // Remove the format property before downloading
    const { format: _, ...dataToDownload } = jsonData;
    
    const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], {
      type: 'application/json'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
        <button
          onClick={fetchShortlistedCandidates}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Refresh
        </button>
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

              {candidate.scheduledInterviewDate && (
                <div className="mb-4 p-3 bg-blue-50 rounded">
                  <p className="font-semibold text-blue-800">Scheduled Interview:</p>
                  <p className="text-blue-700">{new Date(candidate.scheduledInterviewDate).toLocaleString()}</p>
                  {candidate.notes && (
                    <p className="text-blue-600 mt-1">Notes: {candidate.notes}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {candidate.interviewStatus === 'pending' && (
                  <button
                    onClick={() => handleScheduleInterview(candidate)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Start AI Interview Call
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
                
                {/* JSON Detail Actions */}
                <button
                  onClick={() => viewCandidateJson(candidate._id, 'full')}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  View Full JSON
                </button>
                <button
                  onClick={() => viewCandidateJson(candidate._id, 'ai')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  View AI Format
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Interview Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Start AI Interview Call</h2>
            <p className="text-gray-600 mb-4">
              Initiating AI interview call for: <strong>{selectedCandidate?.candidateName}</strong>
            </p>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-sm">
                📞 This will trigger an actual AI-powered phone interview with the candidate.
              </p>
            </div>
            
            <form onSubmit={handleScheduleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({
                    ...scheduleForm,
                    notes: e.target.value
                  })}
                  placeholder="Any additional notes for the interview..."
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Start AI Interview Call
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleModal(false);
                    setSelectedCandidate(null);
                    setScheduleForm({ scheduledInterviewDate: '', notes: '' });
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JSON Details Modal */}
      {showJsonModal && candidateJson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold">
                  Candidate JSON Details 
                  <span className={`ml-2 px-2 py-1 text-xs rounded ${
                    candidateJson.format === 'ai' 
                      ? 'bg-indigo-100 text-indigo-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {candidateJson.format === 'ai' ? 'AI Format' : 'Full Format'}
                  </span>
                </h2>
                <p className="text-sm text-gray-600">
                  {candidateJson.format === 'ai' 
                    ? 'Optimized format for AI interview scheduling system'
                    : 'Complete database record with all details'
                  }
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => downloadCandidateJson(candidateJson)}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Download JSON
                </button>
                <button
                  onClick={() => {
                    setShowJsonModal(false);
                    setCandidateJson(null);
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              <div className="bg-gray-100 p-4 rounded border">
                <h3 className="font-semibold mb-2">
                  Candidate: {candidateJson.candidateName || candidateJson.name || 'N/A'}
                </h3>
                <pre className="text-sm whitespace-pre-wrap font-mono bg-white p-4 rounded border overflow-auto">
                  {JSON.stringify(candidateJson, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h4 className="font-semibold text-blue-800 mb-2">
                {candidateJson.format === 'ai' ? 'AI System Integration:' : 'Full Database Record:'}
              </h4>
              <p className="text-blue-700 text-sm">
                {candidateJson.format === 'ai' 
                  ? 'This clean format is optimized for AI consumption with computed match scores, structured technical profiles, and ready-to-use scheduling data.'
                  : 'This complete record includes raw database fields, populated references, and all associated data needed for comprehensive analysis.'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShortlistedCandidates;