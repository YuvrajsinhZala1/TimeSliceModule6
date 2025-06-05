import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
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
          <p className="auth-subtitle">Welcome back! Please sign in to your account</p>
        </div>
        
        {error && (
          <div className="error" style={{ marginBottom: '2rem', borderRadius: '12px' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>
          
          <div className="auth-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
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
                Signing in...
              </span>
            ) : (
              'Sign In to TimeSlice'
            )}
          </button>
        </form>
        
        <div className="auth-footer">
          <p style={{ color: '#666', marginBottom: '0' }}>
            Don't have an account yet?{' '}
            <Link to="/register">Create your TimeSlice account</Link>
          </p>
        </div>
        
        {/* Features reminder */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: 'rgba(0, 119, 190, 0.1)', 
          borderRadius: '15px',
          border: '1px solid rgba(0, 119, 190, 0.2)'
        }}>
          <h4 style={{ 
            color: 'var(--ocean-dark)', 
            marginBottom: '1rem', 
            textAlign: 'center',
            fontSize: '1.1rem'
          }}>
            🎯 What's waiting for you
          </h4>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '0.8rem',
            fontSize: '0.9rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🤝</span>
              <span>Help & get help</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>💰</span>
              <span>Earn credits</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>💬</span>
              <span>Real-time chat</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>⭐</span>
              <span>Build reputation</span>
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

export default Login;