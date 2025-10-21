// pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [selectedRole, setSelectedRole] = useState('candidate');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      
      // Check if logged in user's role matches selected role
      if (response.data.user.role !== selectedRole) {
        setError(`This account is registered as a ${response.data.user.role}. Please select the correct option.`);
        setLoading(false);
        return;
      }
      
      onLogin(response.data.user, response.data.token);
      navigate(response.data.user.role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard');
    } catch (err) {
      if (err.response?.data?.userId) {
        navigate('/verify-otp', { state: { userId: err.response.data.userId } });
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-12 px-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400 text-lg">Sign in to continue your journey</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side - Role Selection */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 lg:p-12 text-white">
              <h2 className="text-3xl font-bold mb-6">I am a...</h2>
              <p className="text-gray-300 mb-8">Select your role to continue</p>
              
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedRole('candidate')}
                  className={`w-full p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    selectedRole === 'candidate'
                      ? 'bg-white text-gray-900 border-white shadow-lg'
                      : 'bg-transparent text-white border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-xl font-bold mb-1">Job Seeker</h3>
                      <p className={`text-sm ${selectedRole === 'candidate' ? 'text-gray-600' : 'text-gray-400'}`}>
                        Looking for opportunities
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedRole === 'candidate' ? 'border-gray-900 bg-gray-900' : 'border-gray-500'
                    }`}>
                      {selectedRole === 'candidate' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('recruiter')}
                  className={`w-full p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    selectedRole === 'recruiter'
                      ? 'bg-white text-gray-900 border-white shadow-lg'
                      : 'bg-transparent text-white border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-xl font-bold mb-1">Recruiter</h3>
                      <p className={`text-sm ${selectedRole === 'recruiter' ? 'text-gray-600' : 'text-gray-400'}`}>
                        Hiring talented professionals
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedRole === 'recruiter' ? 'border-gray-900 bg-gray-900' : 'border-gray-500'
                    }`}>
                      {selectedRole === 'recruiter' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-700">
                <p className="text-gray-400 text-sm mb-4">Trusted by thousands of professionals</p>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">1000+</p>
                    <p className="text-xs text-gray-400">Active Jobs</p>
                  </div>
                  <div className="h-8 w-px bg-gray-700"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">500+</p>
                    <p className="text-xs text-gray-400">Companies</p>
                  </div>
                  <div className="h-8 w-px bg-gray-700"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">5000+</p>
                    <p className="text-xs text-gray-400">Candidates</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="p-8 lg:p-12">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Sign In as {selectedRole === 'candidate' ? 'Job Seeker' : 'Recruiter'}
                </h3>
                <p className="text-gray-600">Enter your credentials to access your account</p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-gray-900 font-semibold hover:underline">
                    Create Account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;