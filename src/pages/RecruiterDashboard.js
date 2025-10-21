// pages/RecruiterDashboard.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { jobAPI, applicationAPI } from '../utils/api';

const RecruiterDashboard = ({ user }) => {
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobApplications, setJobApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsRes, appsRes] = await Promise.all([
        jobAPI.getMyJobs(),
        applicationAPI.getAllApplications()
      ]);
      setJobs(jobsRes.data);
      setApplications(appsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
          {(selectedJob ? jobApplications : applications).length === 0 ? (
            <p className="text-gray-500">No applications yet.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(selectedJob ? jobApplications : applications).slice(0, 10).map((app) => (
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
                    <h4 className="font-semibold">{project.name}</h4>
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