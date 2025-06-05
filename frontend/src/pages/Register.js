import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    primaryRole: '',
    bio: '',
    skills: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (primaryRole) => {
    setFormData({
      ...formData,
      primaryRole
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.primaryRole) {
      setError('Please select your primary role');
      setLoading(false);
      return;
    }

    try {
      const userData = {
        ...formData,
        skills: formData.skills.split(',').map(skill => skill.trim()).filter(skill => skill)
      };
      
      await signup(userData);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container" style={{ maxWidth: '600px' }}>
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-hourglass">
              <div className="auth-hourglass-top"></div>
              <div className="auth-hourglass-middle"></div>
              <div className="auth-hourglass-bottom"></div>
              <div className="auth-sand"></div>
            </div>
            <h1 className="auth-title">TimeSlice</h1>
          </div>
          <p className="auth-subtitle">Join our community of helpers and task providers</p>
        </div>
        
        {error && (
          <div className="error" style={{ marginBottom: '2rem', borderRadius: '12px' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Basic Information */}
          <div style={{ 
            background: 'rgba(0, 119, 190, 0.05)', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            marginBottom: '2rem',
            border: '1px solid rgba(0, 119, 190, 0.1)'
          }}>
            <h3 style={{ 
              color: 'var(--ocean-dark)', 
              marginBottom: '1rem', 
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>👤</span> Basic Information
            </h3>
            
            <div className="auth-form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                required
              />
            </div>
            
            <div className="auth-form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                required
              />
            </div>
            
            <div className="auth-form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
              />
              <small>Choose a strong password with at least 6 characters</small>
            </div>
          </div>

          {/* Role Selection */}
          <div style={{ 
            background: 'rgba(255, 107, 107, 0.05)', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            marginBottom: '2rem',
            border: '1px solid rgba(255, 107, 107, 0.1)'
          }}>
            <h3 style={{ 
              color: 'var(--ocean-dark)', 
              marginBottom: '1rem', 
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>🎯</span> Choose Your Primary Role
            </h3>
            <p style={{ 
              color: 'var(--text-light)', 
              marginBottom: '1.5rem', 
              fontSize: '0.95rem' 
            }}>
              You can do both, but pick your main focus to get started
            </p>
            
            <div className="role-selector">
              <label className="role-option">
                <input
                  type="radio"
                  name="primaryRole"
                  value="helper"
                  checked={formData.primaryRole === 'helper'}
                  onChange={(e) => handleRoleChange(e.target.value)}
                />
                <div className="role-card">
                  <div className="role-icon">🤝</div>
                  <div className="role-title">Helper</div>
                  <div className="role-description">
                    Primarily help others with tasks and earn credits
                  </div>
                </div>
              </label>
              
              <label className="role-option">
                <input
                  type="radio"
                  name="primaryRole"
                  value="taskProvider"
                  checked={formData.primaryRole === 'taskProvider'}
                  onChange={(e) => handleRoleChange(e.target.value)}
                />
                <div className="role-card">
                  <div className="role-icon">📋</div>
                  <div className="role-title">Task Provider</div>
                  <div className="role-description">
                    Primarily post tasks and get help using credits
                  </div>
                </div>
              </label>
            </div>
            
            <div className="role-note">
              <span className="role-note-icon">💡</span>
              <span className="role-note-text">
                Don't worry! You can both post tasks AND help others regardless of your primary role.
              </span>
            </div>
          </div>

          {/* Profile Information */}
          <div style={{ 
            background: 'rgba(0, 119, 190, 0.05)', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            marginBottom: '2rem',
            border: '1px solid rgba(0, 119, 190, 0.1)'
          }}>
            <h3 style={{ 
              color: 'var(--ocean-dark)', 
              marginBottom: '1rem', 
              fontSize: '1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>✨</span> Profile Information
            </h3>
            
            <div className="auth-form-group">
              <label htmlFor="bio">Bio (Optional)</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell others about yourself, your experience, and what you enjoy helping with..."
                rows="3"
                style={{ resize: 'vertical' }}
              />
              <small>A good bio helps others understand your expertise and interests</small>
            </div>
            
            <div className="auth-form-group">
              <label htmlFor="skills">Your Skills (Optional)</label>
              <input
                id="skills"
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g., JavaScript, React, Design, Writing, Data Analysis, Marketing"
              />
              <small>
                Add skills you have OR skills you might need help with. 
                Separate multiple skills with commas.
              </small>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span style={{ 
                  width: '20px', 
                  height: '20px', 
                  border: '2px solid rgba(255,255,255,0.3)', 
                  borderTop: '2px solid white', 
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></span>
                Creating Account...
              </span>
            ) : (
              'Join TimeSlice Community'
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p style={{ color: '#666', marginBottom: '0' }}>
            Already have an account?{' '}
            <Link to="/login">Sign in to TimeSlice</Link>
          </p>
        </div>
        
        {/* Welcome Benefits */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: 'linear-gradient(135deg, rgba(0, 119, 190, 0.1), rgba(255, 107, 107, 0.1))', 
          borderRadius: '15px',
          border: '1px solid rgba(0, 119, 190, 0.2)'
        }}>
          <h4 style={{ 
            color: 'var(--ocean-dark)', 
            marginBottom: '1rem', 
            textAlign: 'center',
            fontSize: '1.1rem'
          }}>
            🎉 What you'll get when you join
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '1rem',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🎁</span>
              <span><strong>100 free credits</strong> to get started</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🚀</span>
              <span><strong>Instant access</strong> to all features</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🔄</span>
              <span><strong>Dual roles</strong> - help & get help</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.3rem' }}>🛡️</span>
              <span><strong>Safe platform</strong> with reviews</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading spinner animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Register;