// File: src/pages/Login.js
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useLogger } from '../hooks/useLogger';
import './Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const logger = useLogger('Login');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      logger.info('User already logged in, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, navigate, logger]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      logger.info('Attempting login', { email: formData.email });
      
      // Basic validation
      if (!formData.email || !formData.password) {
        throw new Error('Please fill in all fields');
      }

      if (!formData.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }

      await login(formData.email, formData.password);
      logger.info('Login successful');
      navigate('/dashboard');
      
    } catch (err) {
      logger.error('Login failed', { error: err.message });
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-page">
      {/* Background Animation */}
      <div className="login-background">
        <div className="floating-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              '--delay': `${i * 0.5}s`,
              '--duration': `${3 + Math.random() * 4}s`
            }}></div>
          ))}
        </div>
      </div>

      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-branding">
          <div className="brand-content">
            {/* Logo */}
            <div className="logo-container">
              <div className="logo-hourglass">
                <div className="hourglass-top"></div>
                <div className="hourglass-middle"></div>
                <div className="hourglass-bottom"></div>
                <div className="sand-particles">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="sand-particle"></div>
                  ))}
                </div>
              </div>
              <h1 className="brand-name">
                <span className="time-text">TIME</span>
                <span className="slice-text">SLICE</span>
              </h1>
            </div>

            {/* Feature Highlights */}
            <div className="features-preview">
              <h2>What's waiting for you</h2>
              <div className="feature-list">
                <div className="feature-item">
                  <div className="feature-icon">🤝</div>
                  <div className="feature-content">
                    <h3>Help & Get Help</h3>
                    <p>Connect with skilled helpers or offer your expertise</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">💰</div>
                  <div className="feature-content">
                    <h3>Earn Credits</h3>
                    <p>Build your virtual currency through quality work</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">💬</div>
                  <div className="feature-content">
                    <h3>Real-time Chat</h3>
                    <p>Instant communication with your task partners</p>
                  </div>
                </div>
                <div className="feature-item">
                  <div className="feature-icon">⭐</div>
                  <div className="feature-content">
                    <h3>Build Reputation</h3>
                    <p>Grow your profile with positive reviews</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-container">
          <div className="login-form-content">
            <div className="form-header">
              <h2>Welcome Back!</h2>
              <p>Please sign in to your TimeSlice account</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <div className="alert-icon">⚠️</div>
                <div className="alert-message">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address"
                    className="form-control"
                    required
                    disabled={loading}
                  />
                  <div className="input-icon">📧</div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="form-control"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={togglePasswordVisibility}
                    disabled={loading}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot Password?
                </Link>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-login"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="loading-spinner"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    Sign In to TimeSlice
                    <span className="btn-arrow">→</span>
                  </>
                )}
              </button>
            </form>

            <div className="form-footer">
              <p>
                Don't have an account yet?{' '}
                <Link to="/register" className="register-link">
                  Create your TimeSlice account
                </Link>
              </p>
            </div>

            {/* Professional Footer */}
            <div className="login-footer">
              <p>&copy; 2024 TimeSlice. Professional time-sharing platform.</p>
              <div className="footer-links">
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
                <Link to="/support">Support</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;