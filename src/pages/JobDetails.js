import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { jobAPI } from '../utils/api';

const JobDetails = ({ user }) => {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchJob();
  }, [id]);

  const fetchJob = async () => {
    try {
      const response = await jobAPI.getJob(id);
      setJob(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!job) {
    return <div className="container mx-auto px-4 py-8">Job not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back
      </button>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
          <p className="text-xl text-gray-600 mb-1">{job.company}</p>
          <p className="text-gray-500">{job.location}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <span className="text-sm text-gray-600">Job Type:</span>
            <p className="font-semibold">{job.type}</p>
          </div>
          {job.salary && (
            <div>
              <span className="text-sm text-gray-600">Salary:</span>
              <p className="font-semibold">{job.salary}</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Description</h3>
          <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
        </div>

        {job.requirements && job.requirements.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Requirements</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {job.requirements.map((req, idx) => (
                <li key={idx}>{req}</li>
              ))}
            </ul>
          </div>
        )}

        {job.techStack && job.techStack.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {job.techStack.map((tech, idx) => (
                <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {user && user.role === 'candidate' && (
          <Link
            to={`/jobs/${job._id}/apply`}
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 text-lg"
          >
            Apply Now
          </Link>
        )}

        {!user && (
          <p className="text-gray-600">
            Please <Link to="/login" className="text-blue-600 hover:underline">login</Link> as a candidate to apply for this job.
          </p>
        )}
      </div>
    </div>
  );
};

export default JobDetails;
