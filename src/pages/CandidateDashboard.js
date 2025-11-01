// pages/CandidateDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { applicationAPI, authAPI } from '../utils/api';

const CandidateDashboard = ({ user }) => {
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [profileData, setProfileData] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    fetchApplications();
    fetchProfile();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, applications]);

  const fetchApplications = async () => {
    try {
      const response = await applicationAPI.getMyApplications();
      setApplications(response.data);
      setFilteredApplications(response.data);
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

    setFilteredApplications(filtered);
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      dateRange: 'all'
    });
  };

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const profile = response.data.profile || {};
      setProfileData(profile);
      
      // Calculate profile completion
      const fields = [
        profile.phone,
        profile.location,
        profile.bio,
        profile.techStack?.length > 0,
        profile.experience,
        profile.education,
        profile.projects?.length > 0,
        profile.skills?.length > 0
      ];
      
      const completed = fields.filter(field => field).length;
      const percentage = Math.round((completed / fields.length) * 100);
      setProfileCompletion(percentage);
    } catch (err) {
      console.error(err);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}!</h1>
        <p className="text-gray-600">Manage your job applications</p>
      </div>

      {/* Profile Completion Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 mb-6 text-white">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-xl font-bold">Profile Completion</h3>
            <p className="text-blue-100 text-sm">Complete your profile to improve job application success</p>
          </div>
          <div className="text-3xl font-bold">{profileCompletion}%</div>
        </div>
        <div className="w-full bg-blue-300 rounded-full h-3 mb-3">
          <div 
            className="bg-white h-3 rounded-full transition-all duration-500" 
            style={{ width: `${profileCompletion}%` }}
          ></div>
        </div>
        <Link 
          to="/candidate/profile"
          className="inline-block bg-white text-blue-600 px-4 py-2 rounded font-semibold hover:bg-blue-50 transition"
        >
          {profileCompletion === 100 ? 'View Profile' : 'Complete Profile'}
        </Link>
      </div>

      <div className="mb-6">
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Browse Jobs
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">My Applications</h2>

        {loading ? (
          <p>Loading applications...</p>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {applications.length === 0 ? (
              <>
                <p className="mb-4">You haven't applied to any jobs yet.</p>
                <Link to="/" className="text-blue-600 hover:underline">
                  Start browsing jobs
                </Link>
              </>
            ) : (
              <p>No applications match your filters.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div key={app._id} className="border rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{app.job.title}</h3>
                    <p className="text-gray-600">{app.job.company}</p>
                    <p className="text-sm text-gray-500">{app.job.location}</p>
                  </div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(app.status)}`}>
                    {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                  </span>
                </div>

                <div className="text-sm text-gray-500 mb-3">
                  Applied on: {new Date(app.appliedAt).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/jobs/${app.job._id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View Job
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidateDashboard;