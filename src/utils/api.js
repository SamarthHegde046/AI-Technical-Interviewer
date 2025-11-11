// utils/api.js
import axios from 'axios';

// Temporary fix: Use localhost since production has issues
const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const jobAPI = {
  getAllJobs: (params) => api.get('/jobs', { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  createJob: (data) => api.post('/jobs', data),
  getMyJobs: () => api.get('/jobs/recruiter/my-jobs'),
  updateJob: (id, data) => api.put(`/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/jobs/${id}`),
};



export const applicationAPI = {
  submitApplication: (data) => api.post('/applications', data),
  getMyApplications: () => api.get('/applications/my-applications'),
  getJobApplications: (jobId) => api.get(`/applications/job/${jobId}`),
  getAllApplications: () => api.get('/applications/recruiter/all'),
  updateStatus: (id, status) => api.patch(`/applications/${id}/status`, { status }),
  getApplication: (id) => api.get(`/applications/${id}`),
  analyzeProject: (applicationId, projectIndex) => api.post(`/applications/${applicationId}/analyze-project/${projectIndex}`),
};

export const shortlistedAPI = {
  getAllShortlisted: () => api.get('/shortlisted'),
  getShortlistedById: (id) => api.get(`/shortlisted/${id}`),
  getJobShortlisted: (jobId) => api.get(`/shortlisted/job/${jobId}`),
  updateInterviewStatus: (id, data) => api.patch(`/shortlisted/${id}/interview-status`, data),
  getAiFormat: (id) => api.get(`/shortlisted/${id}/ai-format`),
  deleteShortlisted: (id) => api.delete(`/shortlisted/${id}`),
  migrateExisting: () => api.post('/shortlisted/migrate'),
  debug: () => api.get('/shortlisted/debug'),
};

export default api;