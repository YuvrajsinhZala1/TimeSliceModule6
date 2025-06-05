// File: src/components/Navbar.js
import React, { useContext, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ChatContext } from '../context/ChatContext';
import { NotificationContext } from '../context/NotificationContext';
import RoleSwitcher from './RoleSwitcher';
import { useLogger } from '../hooks/useLogger';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const { unreadCount } = useContext(ChatContext);
  const { notifications } = useContext(NotificationContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const logger = useLogger('Navbar');

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
      if (!event.target.closest('.mobile-menu-container')) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      logger.info('User logging out');
      await logout();
      setShowProfileDropdown(false);
      navigate('/');
    } catch (error) {
      logger.error('Logout failed', { error: error.message });
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const isActive = (path) => location.pathname === path;

  // Don't show navbar on login/register pages
  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        {/* Logo Section */}
        <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
          <div className="brand-logo">
            <div className="logo-hourglass-nav">
              <div className="hourglass-top-nav"></div>
              <div className="hourglass-middle-nav"></div>
              <div className="hourglass-bottom-nav"></div>
              <div className="sand-flow">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="sand-particle-nav"></div>
                ))}
              </div>
            </div>
            <div className="brand-text">
              <span className="time-text-nav">TIME</span>
              <span className="slice-text-nav">SLICE</span>
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        {user ? (
          <div className="navbar-menu">
            <div className="nav-links">
              <Link 
                to="/dashboard" 
                className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}
              >
                <span className="nav-icon">📊</span>
                Dashboard
              </Link>
              
              <Link 
                to="/browse-tasks" 
                className={`nav-link ${isActive('/browse-tasks') ? 'active' : ''}`}
              >
                <span className="nav-icon">🔍</span>
                Browse Tasks
              </Link>
              
              <Link 
                to="/post-task" 
                className={`nav-link ${isActive('/post-task') ? 'active' : ''}`}
              >
                <span className="nav-icon">➕</span>
                Post Task
              </Link>
              
              <Link 
                to="/my-tasks" 
                className={`nav-link ${isActive('/my-tasks') ? 'active' : ''}`}
              >
                <span className="nav-icon">📋</span>
                My Tasks
              </Link>
              
              <Link 
                to="/my-bookings" 
                className={`nav-link ${isActive('/my-bookings') ? 'active' : ''}`}
              >
                <span className="nav-icon">📅</span>
                My Bookings
              </Link>
              
              <Link 
                to="/applications" 
                className={`nav-link ${isActive('/applications') ? 'active' : ''}`}
              >
                <span className="nav-icon">📝</span>
                Applications
              </Link>
            </div>

            <div className="navbar-actions">
              {/* Role Switcher */}
              <RoleSwitcher />

              {/* Credits Display */}
              <div className="credits-display">
                <span className="credits-icon">💰</span>
                <span className="credits-amount">{user.credits || 40}</span>
                <span className="credits-label">Credits</span>
              </div>

              {/* Chat Notification */}
              <Link to="/chat" className="nav-notification">
                <span className="notification-icon">💬</span>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </Link>

              {/* General Notifications */}
              <div className="nav-notification">
                <span className="notification-icon">🔔</span>
                {unreadNotifications > 0 && (
                  <span className="notification-badge">{unreadNotifications}</span>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="profile-dropdown-container">
                <button 
                  className="profile-button"
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                >
                  <div className="profile-avatar">
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="profile-name">{user.name || 'User'}</span>
                  <span className="dropdown-arrow">
                    {showProfileDropdown ? '▴' : '▾'}
                  </span>
                </button>

                {showProfileDropdown && (
                  <div className="profile-dropdown">
                    <div className="dropdown-header">
                      <div className="user-info">
                        <div className="user-avatar">
                          {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="user-details">
                          <div className="user-name">{user.name || 'User'}</div>
                          <div className="user-email">{user.email}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-links">
                      <Link 
                        to="/profile" 
                        className="dropdown-link"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <span className="dropdown-icon">👤</span>
                        Profile Settings
                      </Link>
                      <Link 
                        to="/dashboard" 
                        className="dropdown-link"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <span className="dropdown-icon">📊</span>
                        Analytics
                      </Link>
                      <Link 
                        to="/settings" 
                        className="dropdown-link"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <span className="dropdown-icon">⚙️</span>
                        Settings
                      </Link>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-link logout-link"
                      onClick={handleLogout}
                    >
                      <span className="dropdown-icon">🚪</span>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="navbar-menu">
            <div className="nav-links">
              <Link 
                to="/" 
                className={`nav-link ${isActive('/') ? 'active' : ''}`}
              >
                Home
              </Link>
              <Link 
                to="/about" 
                className={`nav-link ${isActive('/about') ? 'active' : ''}`}
              >
                About
              </Link>
              <Link 
                to="/how-it-works" 
                className={`nav-link ${isActive('/how-it-works') ? 'active' : ''}`}
              >
                How It Works
              </Link>
            </div>
            
            <div className="navbar-actions">
              <Link to="/login" className="btn btn-outline btn-sm">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Get Started
              </Link>
            </div>
          </div>
        )}

        {/* Mobile Menu Toggle */}
        <div className="mobile-menu-container">
          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <span className={`hamburger ${isMenuOpen ? 'open' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="mobile-menu">
              <div className="mobile-menu-content">
                {user ? (
                  <>
                    <div className="mobile-user-info">
                      <div className="mobile-avatar">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="mobile-user-details">
                        <div className="mobile-user-name">{user.name || 'User'}</div>
                        <div className="mobile-user-email">{user.email}</div>
                      </div>
                    </div>
                    
                    <div className="mobile-nav-links">
                      <Link to="/dashboard" className="mobile-nav-link">
                        <span className="mobile-nav-icon">📊</span>
                        Dashboard
                      </Link>
                      <Link to="/browse-tasks" className="mobile-nav-link">
                        <span className="mobile-nav-icon">🔍</span>
                        Browse Tasks
                      </Link>
                      <Link to="/post-task" className="mobile-nav-link">
                        <span className="mobile-nav-icon">➕</span>
                        Post Task
                      </Link>
                      <Link to="/my-tasks" className="mobile-nav-link">
                        <span className="mobile-nav-icon">📋</span>
                        My Tasks
                      </Link>
                      <Link to="/my-bookings" className="mobile-nav-link">
                        <span className="mobile-nav-icon">📅</span>
                        My Bookings
                      </Link>
                      <Link to="/applications" className="mobile-nav-link">
                        <span className="mobile-nav-icon">📝</span>
                        Applications
                      </Link>
                      <Link to="/chat" className="mobile-nav-link">
                        <span className="mobile-nav-icon">💬</span>
                        Chat
                        {unreadCount > 0 && (
                          <span className="mobile-badge">{unreadCount}</span>
                        )}
                      </Link>
                      <Link to="/profile" className="mobile-nav-link">
                        <span className="mobile-nav-icon">👤</span>
                        Profile
                      </Link>
                    </div>
                    
                    <button 
                      className="mobile-logout-btn"
                      onClick={handleLogout}
                    >
                      <span className="mobile-nav-icon">🚪</span>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <div className="mobile-nav-links">
                    <Link to="/" className="mobile-nav-link">Home</Link>
                    <Link to="/about" className="mobile-nav-link">About</Link>
                    <Link to="/how-it-works" className="mobile-nav-link">How It Works</Link>
                    <Link to="/login" className="mobile-nav-link">Login</Link>
                    <Link to="/register" className="mobile-nav-link">Get Started</Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;