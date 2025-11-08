// pages/RecruiterDashboard.js
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applicationAPI, jobAPI } from '../utils/api';

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
  const [showScheduleCallModal, setShowScheduleCallModal] = useState(false);
  const [scheduleCallData, setScheduleCallData] = useState(null);
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

  const handleScheduleCall = (application) => {
    setScheduleCallData({
      candidateName: application.candidateName,
      candidateEmail: application.candidateEmail,
      phone: application.phone,
      userId: application.candidate._id,
      jobTitle: application.job.title,
      company: application.job.company,
      applicationId: application._id
    });
    setShowScheduleCallModal(true);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow border p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
            </div>
            <div className="flex gap-3">
              <Link
                to="/recruiter/post-job"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
              >
                Post Job
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Active Jobs Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Active Jobs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {jobs.filter(j => j.status === 'active').length}
                </p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-4-6h.01M12 16h.01" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Applications Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Applications</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{applications.length}</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Pending Review Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Pending Review</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {applications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <div className="p-2 bg-orange-50 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>



        {/* Filters Section - Compact */}
        <div className="bg-white rounded-lg shadow border p-4 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-semibold text-gray-900">Filter Applications</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                {filteredApplications.length} of {applications.length}
              </span>
              <button
                onClick={resetFilters}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Reset
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="shortlisted">Shortlisted</option>
                <option value="rejected">Rejected</option>
            </select>

            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>

            <input
              type="text"
              placeholder="Search candidates..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jobs Section */}
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">My Job Posts</h2>
                <span className="text-sm text-gray-500">{jobs.length} Jobs</span>
              </div>
            </div>
            <div className="p-6">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-4-6h.01M12 16h.01" />
                  </svg>
                  <p className="text-gray-500 mb-4">No jobs posted yet</p>
                  <Link
                    to="/recruiter/post-job"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Post Your First Job
                  </Link>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {jobs.map((job) => (
                    <div
                      key={job._id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => fetchJobApplications(job._id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{job.title}</h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.location}
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          job.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {applications.filter(a => a.job._id === job._id).length} applications
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(job);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteJob(job._id);
                            }}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
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
          </div>

          {/* Applications Section */}
          <div className="bg-white rounded-lg shadow border">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedJob ? 'Applications for Selected Job' : 'Recent Applications'}
                </h2>
                <span className="text-sm text-gray-500">
                  {(selectedJob ? jobApplications : filteredApplications).length} Applications
                </span>
              </div>
            </div>
            <div className="p-6">
              {(selectedJob ? jobApplications : filteredApplications).length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500">No applications match your filters</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {(selectedJob ? jobApplications : filteredApplications).slice(0, 20).map((app) => (
                    <div
                      key={app._id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => viewApplication(app._id)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{app.candidateName}</h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {app.candidateEmail}
                          </div>
                          {!selectedJob && (
                            <div className="flex items-center text-xs text-gray-500 mt-1">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2h8zM16 10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-4-6h.01M12 16h.01" />
                              </svg>
                              {app.job.title}
                            </div>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(app.status)}`}>
                          {app.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Applied: {new Date(app.appliedAt).toLocaleDateString()}
                      </div>
                    </div>
              ))}
                </div>
              )}
            </div>
          </div>
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
                <div className="flex gap-2 flex-wrap">
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
      {showScheduleCallModal && scheduleCallData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">📞 Schedule Call</h2>
                <p className="text-gray-600 mt-1">Candidate contact information</p>
              </div>
              <button
                onClick={() => setShowScheduleCallModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Candidate Name
                    </label>
                    <p className="text-xl font-bold text-gray-900 mt-1">
                      {scheduleCallData.candidateName}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Phone Number
                    </label>
                    <p className="text-lg font-semibold text-purple-600 mt-1 flex items-center gap-2">
                      📱 {scheduleCallData.phone}
                      <button
                        onClick={() => navigator.clipboard.writeText(scheduleCallData.phone)}
                        className="text-xs bg-white px-2 py-1 rounded hover:bg-gray-100"
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Email Address
                    </label>
                    <p className="text-lg font-semibold text-blue-600 mt-1 flex items-center gap-2 break-all">
                      ✉️ {scheduleCallData.candidateEmail}
                      <button
                        onClick={() => navigator.clipboard.writeText(scheduleCallData.candidateEmail)}
                        className="text-xs bg-white px-2 py-1 rounded hover:bg-gray-100 flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      User ID
                    </label>
                    <p className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200 mt-1">
                      {scheduleCallData.userId}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Applied For
                    </label>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {scheduleCallData.jobTitle}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Company
                    </label>
                    <p className="text-lg font-semibold text-gray-700 mt-1">
                      {scheduleCallData.company}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                      Application ID
                    </label>
                    <p className="text-sm font-mono bg-white px-3 py-2 rounded border border-gray-200 mt-1 break-all">
                      {scheduleCallData.applicationId}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-yellow-900 mb-2">🔔 Quick Actions</h3>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>• Click the Copy buttons to copy contact information</p>
                <p>• Use this information to schedule a call via your preferred platform</p>
                <p>• This feature will integrate with scheduling APIs in future updates</p>
              </div>
            </div>

            <div className="flex gap-3">
              <a
                href={`tel:${scheduleCallData.phone}`}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold text-center"
              >
                📞 Call Now
              </a>
              <a
                href={`mailto:${scheduleCallData.candidateEmail}?subject=Interview Schedule - ${scheduleCallData.jobTitle}`}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-center"
              >
                ✉️ Send Email
              </a>
              <button
                onClick={() => setShowScheduleCallModal(false)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default RecruiterDashboard;