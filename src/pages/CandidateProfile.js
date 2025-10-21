// pages/CandidateProfile.js
import React, { useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

const CandidateProfile = ({ user, setUser }) => {
  const [profile, setProfile] = useState({
    name: user?.name || '',
    phone: '',
    location: '',
    bio: '',
    techStack: '',
    experience: '',
    education: '',
    resume: '',
    portfolio: '',
    linkedin: '',
    github: '',
    skills: '',
    projects: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data;
      
      setProfile({
        name: userData.name || '',
        phone: userData.profile?.phone || '',
        location: userData.profile?.location || '',
        bio: userData.profile?.bio || '',
        techStack: userData.profile?.techStack?.join(', ') || '',
        experience: userData.profile?.experience || '',
        education: userData.profile?.education || '',
        resume: userData.profile?.resume || '',
        portfolio: userData.profile?.portfolio || '',
        linkedin: userData.profile?.linkedin || '',
        github: userData.profile?.github || '',
        skills: userData.profile?.skills?.join(', ') || '',
        projects: userData.profile?.projects || []
      });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  };

  const addProject = () => {
    setProfile({
      ...profile,
      projects: [...profile.projects, { name: '', description: '', githubLink: '', techUsed: '', liveLink: '' }]
    });
  };

  const removeProject = (index) => {
    const newProjects = profile.projects.filter((_, i) => i !== index);
    setProfile({ ...profile, projects: newProjects });
  };

  const updateProject = (index, field, value) => {
    const newProjects = [...profile.projects];
    newProjects[index][field] = value;
    setProfile({ ...profile, projects: newProjects });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setSaving(true);

    try {
      const dataToSend = {
        name: profile.name,
        profile: {
          phone: profile.phone,
          location: profile.location,
          bio: profile.bio,
          techStack: profile.techStack.split(',').map(s => s.trim()).filter(s => s),
          experience: profile.experience,
          education: profile.education,
          resume: profile.resume,
          portfolio: profile.portfolio,
          linkedin: profile.linkedin,
          github: profile.github,
          skills: profile.skills.split(',').map(s => s.trim()).filter(s => s),
          projects: profile.projects.map(p => ({
            ...p,
            techUsed: typeof p.techUsed === 'string' 
              ? p.techUsed.split(',').map(s => s.trim()).filter(s => s)
              : p.techUsed
          }))
        }
      };

      const response = await authAPI.updateProfile(dataToSend);
      
      // Update user in localStorage and state
      const updatedUser = { ...user, name: response.data.user.name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      // Scroll to top to show message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      {message.text && (
        <div className={`mb-6 p-4 rounded ${
          message.type === 'success' 
            ? 'bg-green-100 border border-green-400 text-green-700' 
            : 'bg-red-100 border border-red-400 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Basic Information */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-blue-600">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name *</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g., Bangalore, India"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.location}
                onChange={(e) => setProfile({ ...profile, location: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Years of Experience</label>
              <input
                type="text"
                placeholder="e.g., 3 years"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.experience}
                onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Bio</label>
            <textarea
              rows="3"
              placeholder="Tell us about yourself..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            />
          </div>
        </div>

        {/* Skills & Tech Stack */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-blue-600">Skills & Technology</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tech Stack (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., React, Node.js, MongoDB, Python"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.techStack}
                onChange={(e) => setProfile({ ...profile, techStack: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Skills (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g., Problem Solving, Communication, Team Leadership"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.skills}
                onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Education */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-blue-600">Education</h2>
          <textarea
            rows="3"
            placeholder="e.g., B.Tech in Computer Science - ABC University (2018-2022)"
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={profile.education}
            onChange={(e) => setProfile({ ...profile, education: e.target.value })}
          />
        </div>

        {/* Projects */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-600">Projects</h2>
            <button
              type="button"
              onClick={addProject}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              + Add Project
            </button>
          </div>

          {profile.projects.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No projects added yet. Click "Add Project" to get started.</p>
          ) : (
            <div className="space-y-4">
              {profile.projects.map((project, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Project {index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => removeProject(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Project Name"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={project.name}
                    onChange={(e) => updateProject(index, 'name', e.target.value)}
                  />

                  <textarea
                    placeholder="Project Description"
                    rows="3"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={project.description}
                    onChange={(e) => updateProject(index, 'description', e.target.value)}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="url"
                      placeholder="GitHub Link"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={project.githubLink}
                      onChange={(e) => updateProject(index, 'githubLink', e.target.value)}
                    />

                    <input
                      type="url"
                      placeholder="Live Demo Link (optional)"
                      className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={project.liveLink}
                      onChange={(e) => updateProject(index, 'liveLink', e.target.value)}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Technologies Used (comma-separated)"
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={typeof project.techUsed === 'string' ? project.techUsed : project.techUsed?.join(', ')}
                    onChange={(e) => updateProject(index, 'techUsed', e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Links */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-blue-600">Links & Resume</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Resume URL</label>
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.resume}
                onChange={(e) => setProfile({ ...profile, resume: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Portfolio URL</label>
              <input
                type="url"
                placeholder="https://yourportfolio.com"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.portfolio}
                onChange={(e) => setProfile({ ...profile, portfolio: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input
                type="url"
                placeholder="https://linkedin.com/in/..."
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.linkedin}
                onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">GitHub URL</label>
              <input
                type="url"
                placeholder="https://github.com/..."
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={profile.github}
                onChange={(e) => setProfile({ ...profile, github: e.target.value })}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-semibold"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default CandidateProfile;