// pages/VerifyOTP.js
import React, { useState, useEffect } from 'react';
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
  const email = location.state?.email;
  const otpProvided = location.state?.otpProvided;

  useEffect(() => {
    if (otpProvided) {
      setSuccess(`Email service unavailable. Use this OTP: ${otpProvided}`);
    }
  }, [otpProvided]);

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
      const response = await authAPI.resendOTP({ userId });
      
      // Check if OTP is returned in response (email failed)
      if (response.data.otp) {
        setSuccess(`OTP: ${response.data.otp} (Email service unavailable)`);
      } else {
        setSuccess('OTP resent successfully! Check your email.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white rounded-full mb-4">
            <svg className="w-12 h-12 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-gray-400 text-lg">We've sent a verification code to</p>
          <p className="text-white font-semibold mt-1">{email}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">Enter Verification Code</h3>
          <p className="text-gray-600 text-center mb-6">Please enter the 6-digit code</p>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6">
              <p className="text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                required
                maxLength="6"
                className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl text-center text-3xl tracking-widest font-bold focus:outline-none focus:border-gray-900 transition-colors"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
              />
              <p className="text-xs text-gray-500 text-center mt-2">Code expires in 10 minutes</p>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gray-900 text-white py-4 rounded-xl font-semibold hover:bg-gray-800 disabled:bg-gray-400 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-3">Didn't receive the code?</p>
            <button
              onClick={handleResendOTP}
              className="text-gray-900 font-semibold hover:underline text-sm"
            >
              Resend Code
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Having trouble? Contact our support team
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;