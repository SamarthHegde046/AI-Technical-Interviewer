// components/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user, onLogout }) => {
  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">JobPortal</Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm">Welcome, {user.name}</span>
              <Link 
                to={user.role === 'recruiter' ? '/recruiter/dashboard' : '/candidate/dashboard'} 
                className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-800"
              >
                Dashboard
              </Link>
              <button 
                onClick={onLogout}
                className="px-4 py-2 bg-red-500 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-4 py-2 bg-blue-700 rounded hover:bg-blue-800">
                Login
              </Link>
              <Link to="/register" className="px-4 py-2 bg-green-500 rounded hover:bg-green-600">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
