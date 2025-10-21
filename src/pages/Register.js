// pages/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'candidate'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...dataToSend } = formData;
      const response = await authAPI.register(dataToSend);
      navigate('/verify-otp', { state: { userId: response.data.userId, email: formData.email } });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-12 px-4">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Join Us Today</h1>
          <p className="text-gray-400 text-lg">Create your account and start your journey</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Side - Role Selection */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-8 lg:p-12 text-white">
              <h2 className="text-3xl font-bold mb-6">Choose Your Path</h2>
              <p className="text-gray-300 mb-8">Select how you want to join our platform</p>
              
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'candidate' })}
                  className={`w-full p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    formData.role === 'candidate'
                      ? 'bg-white text-gray-900 border-white shadow-lg'
                      : 'bg-transparent text-white border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-xl font-bold mb-1">Job Seeker</h3>
                      <p className={`text-sm ${formData.role === 'candidate' ? 'text-gray-600' : 'text-gray-400'}`}>
                        Find your dream job
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      formData.role === 'candidate' ? 'border-gray-900 bg-gray-900' : 'border-gray-500'
                    }`}>
                      {formData.role === 'candidate' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className={`mt-4 pt-4 border-t ${formData.role === 'candidate' ? 'border-gray-300' : 'border-gray-700'}`}>
                    <ul className={`space-y-2 text-sm ${formData.role === 'candidate' ? 'text-gray-700' : 'text-gray-400'}`}>
                      <li>✓ Browse thousands of jobs</li>
                      <li>✓ Apply with one click</li>
                      <li>✓ Track applications</li>
                      <li>✓ Build your profile</li>
                    </ul>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'recruiter' })}
                  className={`w-full p-6 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                    formData.role === 'recruiter'
                      ? 'bg-white text-gray-900 border-white shadow-lg'
                      : 'bg-transparent text-white border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-xl font-bold mb-1">Recruiter</h3>
                      <p className={`text-sm ${formData.role === 'recruiter' ? 'text-gray-600' : 'text-gray-400'}`}>
                        Hire top talent
                      </p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      formData.role === 'recruiter' ? 'border-gray-900 bg-gray-900' : 'border-gray-500'
                    }`}>
                      {formData.role === 'recruiter' && (
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <div className={`mt-4 pt-4 border-t ${formData.role === 'recruiter' ? 'border-gray-300' : 'border-gray-700'}`}>
                    <ul className={`space-y-2 text-sm ${formData.role === 'recruiter' ? 'text-gray-700' : 'text-gray-400'}`}>
                      <li>✓ Post unlimited jobs</li>
                      <li>✓ Manage applications</li>
                      <li>✓ Review candidates</li>
                      <li>✓ Build your team</li>
                    </ul>
                  </div>
                </button>
              </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="p-8 lg:p-12">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Create Account as {formData.role === 'candidate' ? 'Job Seeker' : 'Recruiter'}
                </h3>
                <p className="text-gray-600">Fill in your details to get started</p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

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
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 transition-colors"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="text-gray-900 font-semibold hover:underline">
                    Sign In
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

export default Register;