// pages/ApplyJob.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate,Link } from 'react-router-dom';
import { jobAPI, applicationAPI, authAPI } from '../utils/api';
const ApplyJob = ({ user }) => {
  const [job, setJob] = useState(null);
  const [formData, setFormData] = useState({
    candidateName: user?.name || '',
    candidateEmail: user?.email || '',
    phone: '',
    techStack: '',
    experience: '',
    projects: [{ name: '', description: '', githubLink: '', techUsed: '' }],
    coverLetter: ''
  });
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJob();
    fetchProfileData();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await jobAPI.getJob(id);
      setJob(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProfileData = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data;
      
      // Auto-fill form with profile data
      if (userData.profile) {
        setFormData({
          candidateName: userData.name || '',
          candidateEmail: userData.email || '',
          phone: userData.profile.phone || '',
          techStack: userData.profile.techStack?.join(', ') || '',
          experience: userData.profile.experience || '',
          projects: userData.profile.projects?.length > 0 
            ? userData.profile.projects.map(p => ({
                name: p.name || '',
                description: p.description || '',
                githubLink: p.githubLink || '',
                techUsed: Array.isArray(p.techUsed) ? p.techUsed.join(', ') : ''
              }))
            : [{ name: '', description: '', githubLink: '', techUsed: '' }],
          coverLetter: ''
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [...formData.projects, { name: '', description: '', githubLink: '', techUsed: '' }]
    });
  };

  const removeProject = (index) => {
    const newProjects = formData.projects.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: newProjects });
  };

  const updateProject = (index, field, value) => {
    const newProjects = [...formData.projects];
    newProjects[index][field] = value;
    setFormData({ ...formData, projects: newProjects });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const dataToSend = {
        jobId: id,
        ...formData,
        techStack: formData.techStack.split(',').map(s => s.trim()),
        projects: formData.projects.map(p => ({
          ...p,
          techUsed: p.techUsed.split(',').map(s => s.trim())
        }))
      };

      await applicationAPI.submitApplication(dataToSend);
      setSuccess(true);
      setTimeout(() => navigate('/candidate/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (!job || profileLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-center">
          Application submitted successfully! Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Apply for {job.title}</h1>
      <p className="text-gray-600 mb-2">at {job.company}</p>
      <p className="text-sm text-blue-600 mb-6">
        💡 Data auto-filled from your profile. You can edit it before submitting. 
        <Link to="/candidate/profile" className="underline ml-1">Update Profile</Link>
      </p>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.candidateName}
              onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.candidateEmail}
              onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone *</label>
          <input
            type="tel"
            required
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tech Stack * (comma-separated)</label>
          <input
            type="text"
            required
            placeholder="React, Node.js, MongoDB"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.techStack}
            onChange={(e) => setFormData({ ...formData, techStack: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Years of Experience *</label>
          <input
            type="text"
            required
            placeholder="e.g., 2 years"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Projects *</label>
            <button
              type="button"
              onClick={addProject}
              className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            >
              + Add Project
            </button>
          </div>

          {formData.projects.map((project, index) => (
            <div key={index} className="border rounded p-4 mb-3 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Project {index + 1}</span>
                {formData.projects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProject(index)}
                    className="text-red-500 text-sm hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                required
                placeholder="Project Name"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={project.name}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
              />

              <textarea
                required
                placeholder="Project Description"
                rows="3"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={project.description}
                onChange={(e) => updateProject(index, 'description', e.target.value)}
              />

              <input
                type="url"
                required
                placeholder="GitHub Link"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={project.githubLink}
                onChange={(e) => updateProject(index, 'githubLink', e.target.value)}
              />

              <input
                type="text"
                required
                placeholder="Technologies Used (comma-separated)"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={project.techUsed}
                onChange={(e) => updateProject(index, 'techUsed', e.target.value)}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Cover Letter</label>
          <textarea
            rows="5"
            placeholder="Tell us why you're a great fit for this position..."
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={formData.coverLetter}
            onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
};

export default ApplyJob;