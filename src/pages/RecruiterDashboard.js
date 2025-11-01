// pages/RecruiterDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobAPI, applicationAPI } from '../utils/api';

const RecruiterDashboard = ({ user }) => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobApplications, setJobApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [showAIDetailsModal, setShowAIDetailsModal] = useState(false);
  const [selectedAIAnalysis, setSelectedAIAnalysis] = useState(null);
  const navigate = useNavigate();

  // Filters
  const [filters, setFilters] = useState({
    status: 'all',
    aiStatus: 'all',
    dateRange: 'all',
    search: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, applications]);

  const fetchData = async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        jobAPI.getMyJobs(),
        applicationAPI.getAllApplications()
      ]);
      setJobs(jobsRes.data);
      setApplications(appsRes.data);
      setFilteredApplications(appsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...applications];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(app => app.status === filters.status);
    }

    // AI Status filter
    if (filters.aiStatus !== 'all') {
      filtered = filtered.filter(app => {
        if (!app.projects || app.projects.length === 0) return false;
        
        if (filters.aiStatus === 'completed') {
          return app.projects.some(p => p.aiAnalysis?.status === 'completed');
        } else if (filters.aiStatus === 'pending') {
          return app.projects.some(p => !p.aiAnalysis || p.aiAnalysis.status === 'pending');
        } else if (filters.aiStatus === 'analyzing') {
          return app.projects.some(p => p.aiAnalysis?.status === 'analyzing');
        } else if (filters.aiStatus === 'failed') {
          return app.projects.some(p => p.aiAnalysis?.status === 'failed');
        }
        return true;
      });
    }

    // Date Range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(app => {
        const appDate = new Date(app.appliedAt);
        const diffTime = Math.abs(now - appDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (filters.dateRange === 'today') return diffDays <= 1;
        if (filters.dateRange === 'week') return diffDays <= 7;
        if (filters.dateRange === 'month') return diffDays <= 30;
        return true;
      });
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(app => 
        app.candidateName.toLowerCase().includes(searchLower) ||
        app.candidateEmail.toLowerCase().includes(searchLower) ||
        app.job?.title.toLowerCase().includes(searchLower)
      );
    }

    setFilteredApplications(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      aiStatus: 'all',
      dateRange: 'all',
      search: ''
    });
  };

  const fetchJobApplications = async (jobId) => {
    try {
      const response = await applicationAPI.getJobApplications(jobId);
      setJobApplications(response.data);
      setSelectedJob(jobId);
    } catch (err) {
      console.error(err);
    }
  };

  const viewApplication = async (appId) => {
    try {
      const response = await applicationAPI.getApplication(appId);
      setSelectedApplication(response.data);
      setShowApplicationModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const updateApplicationStatus = async (appId, status) => {
    try {
      await applicationAPI.updateStatus(appId, status);
      fetchJobApplications(selectedJob);
      setShowApplicationModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteJob = async (jobId) => {
    if (window.confirm('Are you sure you want to delete this job?')) {
      try {
        await jobAPI.deleteJob(jobId);
        fetchData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const openEditModal = (job) => {
    setEditingJob({
      ...job,
      requirements: job.requirements.join('\n'),
      techStack: job.techStack.join(', ')
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        ...editingJob,
        requirements: editingJob.requirements.split('\n').filter(r => r.trim()),
        techStack: editingJob.techStack.split(',').map(t => t.trim()).filter(t => t)
      };
      await jobAPI.updateJob(editingJob._id, dataToSend);
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update job');
    }
  };

  const getAIStatusColor = (status) => {
    const colors = {
      pending: 'text-gray-600',
      analyzing: 'text-blue-600',
      completed: 'text-green-600',
      failed: 'text-red-600'
    };
    return colors[status] || 'text-gray-600';
  };

  const getAIStatusBadge = (status) => {
    const badges = {
      pending: 'bg-gray-100 text-gray-800',
      analyzing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const viewAIDetails = (aiAnalysis, projectName) => {
    setSelectedAIAnalysis({ ...aiAnalysis, projectName });
    setShowAIDetailsModal(true);
  };

  const triggerAnalysis = async (applicationId, projectIndex) => {
    try {
      await applicationAPI.analyzeProject(applicationId, projectIndex);
      alert('Analysis triggered successfully');
      viewApplication(applicationId);
    } catch (err) {
      console.error(err);
      alert('Failed to trigger analysis');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewed: 'bg-blue-100 text-blue-800',
      shortlisted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Recruiter Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Active Jobs</h3>
          <p className="text-3xl font-bold text-blue-900">{jobs.filter(j => j.status === 'active').length}</p>
        </div>
        <div className="bg-green-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Total Applications</h3>
          <p className="text-3xl font-bold text-green-900">{applications.length}</p>
        </div>
        <div className="bg-purple-100 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-800 mb-2">Shortlisted</h3>
          <p className="text-3xl font-bold text-purple-900">
            {applications.filter(a => a.status === 'shortlisted').length}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <Link
          to="/recruiter/post-job"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          + Post New Job
        </Link>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Filter Applications</h3>
          <button
            onClick={resetFilters}
            className="text-sm text-blue-600 hover:underline"
          >
            Reset Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Application Status</label>
            <select
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="shortlisted">Shortlisted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">AI Analysis</label>
            <select
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.aiStatus}
              onChange={(e) => setFilters({ ...filters, aiStatus: e.target.value })}
            >
              <option value="all">All</option>
              <option value="completed">Completed</option>
              <option value="analyzing">Analyzing</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <select
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              placeholder="Name, email, job..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredApplications.length} of {applications.length} applications
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">My Job Posts</h2>
          {jobs.length === 0 ? (
            <p className="text-gray-500">No jobs posted yet.</p>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="border rounded p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => fetchJobApplications(job._id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="text-sm text-gray-600">{job.location}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      {applications.filter(a => a.job._id === job._id).length} applications
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(job);
                        }}
                        className="text-blue-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteJob(job._id);
                        }}
                        className="text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">
            {selectedJob ? 'Applications for Selected Job' : 'Recent Applications'}
          </h2>
          {(selectedJob ? jobApplications : filteredApplications).length === 0 ? (
            <p className="text-gray-500">No applications match your filters.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(selectedJob ? jobApplications : filteredApplications).slice(0, 20).map((app) => (
                <div
                  key={app._id}
                  className="border rounded p-4 hover:shadow-md transition cursor-pointer"
                  onClick={() => viewApplication(app._id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{app.candidateName}</h3>
                      <p className="text-sm text-gray-600">{app.candidateEmail}</p>
                      {!selectedJob && (
                        <p className="text-xs text-gray-500">{app.job.title}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(app.status)}`}>
                      {app.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Applied: {new Date(app.appliedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showApplicationModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Application Details</h2>
              <button
                onClick={() => setShowApplicationModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">Candidate Information</h3>
                <p><strong>Name:</strong> {selectedApplication.candidateName}</p>
                <p><strong>Email:</strong> {selectedApplication.candidateEmail}</p>
                <p><strong>Phone:</strong> {selectedApplication.phone}</p>
                <p><strong>Experience:</strong> {selectedApplication.experience}</p>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedApplication.techStack.map((tech, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">Projects</h3>
                {selectedApplication.projects.map((project, idx) => (
                  <div key={idx} className="border rounded p-3 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold">{project.name}</h4>
                      {project.aiAnalysis && (
                        <span className={`px-2 py-1 rounded text-xs ${getAIStatusBadge(project.aiAnalysis.status)}`}>
                          AI: {project.aiAnalysis.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{project.description}</p>
                    <a
                      href={project.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View on GitHub →
                    </a>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.techUsed.map((tech, i) => (
                        <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                          {tech}
                        </span>
                      ))}
                    </div>

                    {/* AI Analysis Results */}
                    {project.aiAnalysis && project.aiAnalysis.status === 'completed' && project.aiAnalysis.summary && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <h5 className="font-semibold text-sm mb-2">🤖 AI Detection Results</h5>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-600">Files Analyzed:</span>
                            <span className="font-semibold ml-1">{project.aiAnalysis.summary.files_analyzed}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">AI Generated:</span>
                            <span className="font-semibold ml-1 text-red-600">
                              {project.aiAnalysis.summary.ai_percentage}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Human Written:</span>
                            <span className="font-semibold ml-1 text-green-600">
                              {project.aiAnalysis.summary.human_percentage}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Confidence:</span>
                            <span className="font-semibold ml-1">
                              {(project.aiAnalysis.summary.avg_confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => viewAIDetails(project.aiAnalysis, project.name)}
                          className="mt-2 text-blue-600 hover:underline text-xs"
                        >
                          View Detailed Analysis →
                        </button>
                      </div>
                    )}

                    {project.aiAnalysis && project.aiAnalysis.status === 'analyzing' && (
                      <div className="mt-3 p-3 bg-blue-50 rounded text-sm text-blue-700">
                        🔄 AI analysis in progress...
                      </div>
                    )}

                    {project.aiAnalysis && project.aiAnalysis.status === 'failed' && (
                      <div className="mt-3 p-3 bg-red-50 rounded">
                        <p className="text-sm text-red-700">❌ Analysis failed: {project.aiAnalysis.error}</p>
                        <button
                          onClick={() => triggerAnalysis(selectedApplication._id, idx)}
                          className="mt-2 text-blue-600 hover:underline text-xs"
                        >
                          Retry Analysis
                        </button>
                      </div>
                    )}

                    {project.aiAnalysis && project.aiAnalysis.status === 'pending' && (
                      <div className="mt-3">
                        <button
                          onClick={() => triggerAnalysis(selectedApplication._id, idx)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Start AI Analysis
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selectedApplication.coverLetter && (
                <div>
                  <h3 className="font-semibold text-lg mb-2">Cover Letter</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedApplication.coverLetter}</p>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-lg mb-2">Update Status</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'reviewed')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Mark Reviewed
                  </button>
                  <button
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'shortlisted')}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Shortlist
                  </button>
                  <button
                    onClick={() => updateApplicationStatus(selectedApplication._id, 'rejected')}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* AI Details Modal */}
      {showAIDetailsModal && selectedAIAnalysis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">AI Code Detection Analysis</h2>
                <p className="text-gray-600">{selectedAIAnalysis.projectName}</p>
              </div>
              <button
                onClick={() => setShowAIDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {selectedAIAnalysis.status === 'completed' && selectedAIAnalysis.summary && (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Files Analyzed</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedAIAnalysis.summary.files_analyzed}
                    </p>
                    <p className="text-xs text-gray-500">
                      of {selectedAIAnalysis.summary.total_files_found} found
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">AI Generated</p>
                    <p className="text-2xl font-bold text-red-600">
                      {selectedAIAnalysis.summary.ai_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedAIAnalysis.summary.ai_files} files
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Human Written</p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedAIAnalysis.summary.human_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">
                      {selectedAIAnalysis.summary.human_files} files
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Confidence</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(selectedAIAnalysis.summary.avg_confidence * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500">Detection accuracy</p>
                  </div>
                </div>

                {/* Lines Analysis */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold mb-3">Code Lines Analysis</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedAIAnalysis.summary.total_lines}</p>
                      <p className="text-sm text-gray-600">Total Lines</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{selectedAIAnalysis.summary.total_ai_lines}</p>
                      <p className="text-sm text-gray-600">AI Lines ({selectedAIAnalysis.summary.ai_lines_percentage.toFixed(1)}%)</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{selectedAIAnalysis.summary.total_human_lines}</p>
                      <p className="text-sm text-gray-600">Human Lines ({selectedAIAnalysis.summary.human_lines_percentage.toFixed(1)}%)</p>
                    </div>
                  </div>
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-full float-left"
                      style={{ width: `${selectedAIAnalysis.summary.ai_lines_percentage}%` }}
                    ></div>
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full float-left"
                      style={{ width: `${selectedAIAnalysis.summary.human_lines_percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* File-by-File Analysis */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Detailed File Analysis</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedAIAnalysis.files && selectedAIAnalysis.files.map((file, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded border-l-4 ${
                          file.prediction === 'ai'
                            ? 'bg-red-50 border-red-500'
                            : 'bg-green-50 border-green-500'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-mono text-sm font-semibold">{file.file_path}</p>
                            <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                              <div>
                                <span className="text-gray-600">Prediction:</span>
                                <span
                                  className={`ml-1 font-semibold ${
                                    file.prediction === 'ai' ? 'text-red-600' : 'text-green-600'
                                  }`}
                                >
                                  {file.prediction === 'ai' ? '🤖 AI' : '👨‍💻 Human'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Confidence:</span>
                                <span className="ml-1 font-semibold">
                                  {(file.confidence * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-600">Total Lines:</span>
                                <span className="ml-1 font-semibold">{file.line_count}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">AI/Human:</span>
                                <span className="ml-1 font-semibold text-red-600">{file.ai_lines}</span>
                                <span className="mx-1">/</span>
                                <span className="font-semibold text-green-600">{file.human_lines}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Repository Info */}
                {selectedAIAnalysis.repository && (
                  <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                    <h3 className="font-semibold mb-2">Repository Information</h3>
                    <p className="text-sm">
                      <span className="text-gray-600">Owner:</span>{' '}
                      <span className="font-semibold">{selectedAIAnalysis.repository.owner}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Repository:</span>{' '}
                      <span className="font-semibold">{selectedAIAnalysis.repository.name}</span>
                    </p>
                    <a
                      href={selectedAIAnalysis.repository.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Repository →
                    </a>
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500 text-center">
                  <p>⚠️ Note: Currently analyzing Python files only. More languages coming soon.</p>
                  <p>Analysis performed at: {new Date(selectedAIAnalysis.analyzedAt).toLocaleString()}</p>
                </div>
              </>
            )}

            {selectedAIAnalysis.status === 'failed' && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <p className="text-red-700">❌ Analysis Failed</p>
                <p className="text-sm text-gray-600 mt-2">{selectedAIAnalysis.error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditModal && editingJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold">Edit Job</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingJob.title}
                    onChange={(e) => setEditingJob({ ...editingJob, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingJob.company}
                    onChange={(e) => setEditingJob({ ...editingJob, company: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Location *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingJob.location}
                    onChange={(e) => setEditingJob({ ...editingJob, location: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Job Type *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingJob.type}
                    onChange={(e) => setEditingJob({ ...editingJob, type: e.target.value })}
                  >
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Salary</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingJob.salary || ''}
                  onChange={(e) => setEditingJob({ ...editingJob, salary: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tech Stack * (comma-separated)</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingJob.techStack}
                  onChange={(e) => setEditingJob({ ...editingJob, techStack: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea
                  required
                  rows="5"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Requirements (one per line)</label>
                <textarea
                  rows="5"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingJob.requirements}
                  onChange={(e) => setEditingJob({ ...editingJob, requirements: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editingJob.status}
                  onChange={(e) => setEditingJob({ ...editingJob, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  Update Job
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default RecruiterDashboard;