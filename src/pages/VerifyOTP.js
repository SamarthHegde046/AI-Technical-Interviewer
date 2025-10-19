// pages/VerifyOTP.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../utils/api';

const VerifyOTP = ({ onLogin }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userId = location.state?.userId;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.verifyOTP({ userId, otp });
      setSuccess('Email verified successfully!');
      setTimeout(() => {
        onLogin(response.data.user, response.data.token);
        navigate(response.data.user.role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard');
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');
    
    try {
      await authAPI.resendOTP({ userId });
      setSuccess('OTP resent successfully! Check your email.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-6">Verify Email</h2>
        <p className="text-center text-gray-600 mb-6">
          Please enter the 6-digit OTP sent to your email
        </p>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">OTP</label>
            <input
              type="text"
              required
              maxLength="6"
              className="w-full px-3 py-2 border border-gray-300 rounded text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <button
          onClick={handleResendOTP}
          className="w-full mt-3 text-blue-600 hover:underline text-sm"
        >
          Resend OTP
        </button>
      </div>
    </div>
  );
};

export default VerifyOTP;