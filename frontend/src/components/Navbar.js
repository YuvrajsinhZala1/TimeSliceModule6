import React, { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import RoleSwitcher from './RoleSwitcher';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { unreadCount, fetchUnreadCount } = useChat();
  const navigate = useNavigate();
  const location = useLocation();

  // Refresh unread count when navigating to chat page
  useEffect(() => {
    if (currentUser && location.pathname === '/chat') {
      // Small delay to allow chat marking as read
      const timer = setTimeout(() => {
        fetchUnreadCount();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, currentUser, fetchUnreadCount]);

  // Periodically refresh unread count
  useEffect(() => {
    if (currentUser) {
      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [currentUser, fetchUnreadCount]);

  // Don't show navbar on homepage for non-logged in users
  const isHomePage = location.pathname === '/';
  const shouldShowNavbar = currentUser || !isHomePage;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // If we shouldn't show navbar, return null
  if (!shouldShowNavbar) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="container">
        <Link to={currentUser ? "/dashboard" : "/"} style={{ textDecoration: 'none' }}>
          <h1>TimeSlice</h1>
        </Link>
        
        {currentUser ? (
          <ul className="nav-links">
            <li><Link to="/dashboard">Dashboard</Link></li>
            
            {/* Both types of users can now access both sections */}
            <li><Link to="/browse-tasks">Browse Tasks</Link></li>
            <li><Link to="/create-task">Post Task</Link></li>
            <li><Link to="/my-tasks">My Tasks</Link></li>
            
            <li><Link to="/my-bookings">My Bookings</Link></li>
            <li><Link to="/task-applications">Applications</Link></li>
            
            {/* Chat with enhanced unread indicator */}
            <li>
              <Link to="/chat" style={{ position: 'relative' }}>
                Chat
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'linear-gradient(45deg, #dc3545, #ff6b6b)',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '0.2rem 0.4rem',
                    fontSize: '0.7rem',
                    minWidth: '18px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                    animation: unreadCount > 0 ? 'notification-pulse 2s infinite' : 'none'
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </li>
            
            <li><Link to="/profile">Profile</Link></li>
            
            {/* Role Switcher */}
            <li>
              <RoleSwitcher />
            </li>
            
            <li>
              <span style={{ color: '#ffc107' }}>
                Credits: {currentUser.credits}
              </span>
            </li>
            
            <li>
              <span style={{ color: '#17a2b8', fontSize: '0.9rem' }}>
                {currentUser.primaryRole === 'helper' ? '🤝 Helper' : '📋 Provider'}
              </span>
            </li>
            
            <li>
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem' }}
              >
                Logout
              </button>
            </li>
          </ul>
        ) : (
          <ul className="nav-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/register">Register</Link></li>
          </ul>
        )}
      </div>

      {/* CSS for notification animation */}
      <style jsx>{`
        @keyframes notification-pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </nav>
  );
};

export default Navbar;