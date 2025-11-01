// pages/JobList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobAPI, authAPI } from '../utils/api';

const JobList = ({ user }) => {
  const [jobs, setJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [otherJobs, setOtherJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', location: '', type: '' });
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetchJobs();
    if (user && user.role === 'candidate') {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUserProfile(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const calculateMatchPercentage = (job, profile) => {
    if (!profile || !profile.profile || !profile.profile.techStack || !job.techStack) {
      return 0;
    }

    const userTechStack = profile.profile.techStack.map(tech => tech.toLowerCase().trim());
    const jobTechStack = job.techStack.map(tech => tech.toLowerCase().trim());

    if (jobTechStack.length === 0) return 0;

    const matches = jobTechStack.filter(tech => 
      userTechStack.some(userTech => 
        userTech.includes(tech) || tech.includes(userTech)
      )
    );

    return Math.round((matches.length / jobTechStack.length) * 100);
  };

  const categorizeJobs = (allJobs) => {
    if (!user || user.role !== 'candidate' || !userProfile) {
      setOtherJobs(allJobs);
      return;
    }

    const jobsWithMatch = allJobs.map(job => ({
      ...job,
      matchPercentage: calculateMatchPercentage(job, userProfile)
    }));

    // Recommended: 50% or more match
    const recommended = jobsWithMatch
      .filter(job => job.matchPercentage >= 50)
      .sort((a, b) => b.matchPercentage - a.matchPercentage);

    // Other jobs: less than 50% match
    const others = jobsWithMatch
      .filter(job => job.matchPercentage < 50)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setRecommendedJobs(recommended);
    setOtherJobs(others);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await jobAPI.getAllJobs(filters);
      setJobs(response.data);
      categorizeJobs(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    fetchJobs();
  };

  const JobCard = ({ job, showMatch = false }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition relative">
      {showMatch && job.matchPercentage > 0 && (
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            job.matchPercentage >= 80 ? 'bg-green-100 text-green-800' :
            job.matchPercentage >= 60 ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {job.matchPercentage}% Match
          </span>
        </div>
      )}
      
      <h3 className="text-xl font-bold mb-2 pr-20">{job.title}</h3>
      <p className="text-gray-600 mb-1">{job.company}</p>
      <p className="text-gray-500 text-sm mb-3">{job.location}</p>
      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-3">
        {job.type}
      </span>
      
      {job.techStack && job.techStack.length > 0 && (
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {job.techStack.slice(0, 3).map((tech, idx) => (
              <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                {tech}
              </span>
            ))}
            {job.techStack.length > 3 && (
              <span className="text-xs text-gray-500">+{job.techStack.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      <Link
        to={`/jobs/${job._id}`}
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
      >
        View Details
      </Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Browse Jobs</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search jobs..."
            className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          />
          <select
            className="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="Full-time">Full-time</option>
            <option value="Part-time">Part-time</option>
            <option value="Contract">Contract</option>
            <option value="Internship">Internship</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center">Loading jobs...</div>
      ) : (
        <>
          {/* Recommended Jobs Section */}
          {user && user.role === 'candidate' && recommendedJobs.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900">Recommended For You</h2>
                  <p className="text-gray-600 mt-1">
                    Based on your profile tech stack • {recommendedJobs.length} {recommendedJobs.length === 1 ? 'match' : 'matches'}
                  </p>
                </div>
                {!userProfile?.profile?.techStack?.length && (
                  <Link
                    to="/candidate/profile"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Complete profile for better matches
                  </Link>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recommendedJobs.map((job) => (
                  <JobCard key={job._id} job={job} showMatch={true} />
                ))}
              </div>
            </div>
          )}

          {/* All Jobs / Other Jobs Section */}
          <div>
            <h2 className="text-3xl font-bold mb-6">
              {user && user.role === 'candidate' && recommendedJobs.length > 0 
                ? 'Other Jobs' 
                : 'All Jobs'}
            </h2>
            
            {otherJobs.length === 0 ? (
              <p className="text-center text-gray-500">No jobs found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherJobs.map((job) => (
                  <JobCard key={job._id} job={job} showMatch={false} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default JobList;