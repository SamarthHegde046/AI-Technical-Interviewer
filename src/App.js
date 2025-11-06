// App.js
import { useEffect, useState } from 'react';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ApplyJob from './pages/ApplyJob';
import CandidateDashboard from './pages/CandidateDashboard';
import CandidateProfile from './pages/CandidateProfile';
import JobDetails from './pages/JobDetails';
import JobList from './pages/JobList';
import Login from './pages/Login';
import PostJob from './pages/PostJob';
import RecruiterDashboard from './pages/RecruiterDashboard';
import Register from './pages/Register';
import ShortlistedCandidates from './pages/ShortlistedCandidates';
import VerifyOTP from './pages/VerifyOTP';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<JobList user={user} />} />
          <Route path="/login" element={
            user ? <Navigate to={user.role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard'} /> : 
            <Login onLogin={handleLogin} />
          } />
          <Route path="/register" element={
            user ? <Navigate to={user.role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard'} /> : 
            <Register />
          } />
          <Route path="/verify-otp" element={<VerifyOTP onLogin={handleLogin} />} />
          
          <Route path="/jobs/:id" element={<JobDetails user={user} />} />
          <Route path="/jobs/:id/apply" element={
            user && user.role === 'candidate' ? <ApplyJob user={user} /> : <Navigate to="/login" />
          } />
          
          <Route path="/candidate/dashboard" element={
            user && user.role === 'candidate' ? <CandidateDashboard user={user} /> : <Navigate to="/login" />
          } />
          
          <Route path="/candidate/profile" element={
            user && user.role === 'candidate' ? <CandidateProfile user={user} setUser={setUser} /> : <Navigate to="/login" />
          } />
          
          <Route path="/recruiter/dashboard" element={
            user && user.role === 'recruiter' ? <RecruiterDashboard user={user} /> : <Navigate to="/login" />
          } />
          <Route path="/recruiter/post-job" element={
            user && user.role === 'recruiter' ? <PostJob user={user} /> : <Navigate to="/login" />
          } />
          <Route path="/recruiter/shortlisted" element={
            user && user.role === 'recruiter' ? <ShortlistedCandidates user={user} /> : <Navigate to="/login" />
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;