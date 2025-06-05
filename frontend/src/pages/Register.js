// File: src/pages/Register.js
import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import UserTypeSelector from '../components/UserTypeSelector';
import { useLogger } from '../hooks/useLogger';
import './Register.css';

const Register = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'helper',
    skills: [],
    bio: '',
    hourlyRate: '',
    agreeTerms: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const logger = useLogger('Register');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      logger.info('User already logged in, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, navigate, logger]);

  const skillOptions = [
    'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
    'Content Writing', 'Digital Marketing', 'Data Analysis', 'Video Editing',
    'Photography', 'Translation', 'Virtual Assistant', 'Accounting',
    'Project Management', 'SEO', 'Social Media Management', 'Tutoring'
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const validateStep = (stepNumber) => {
    switch (stepNumber) {
      case 1:
        if (!formData.name.trim()) {
          setError('Name is required');
          return false;
        }
        if (!formData.email.trim()) {
          setError('Email is required');
          return false;
        }
        if (!formData.email.includes('@')) {
          setError('Please enter a valid email address');
          return false;
        }
        break;
      case 2:
        if (!formData.password) {
          setError('Password is required');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        break;
      case 3:
        if (formData.userType === 'helper' && formData.skills.length === 0) {
          setError('Please select at least one skill');
          return false;
        }
        if (formData.userType === 'helper' && !formData.hourlyRate) {
          setError('Please set your hourly rate');
          return false;
        }
        break;
      case 4:
        if (!formData.agreeTerms) {
          setError('You must agree to the terms and conditions');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setError('');
      setStep(step + 1);
      logger.info('Registration step completed', { step, userType: formData.userType });
    }
  };

  const prevStep = () => {
    setStep(step - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep(4)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      logger.info('Attempting registration', { 
        email: formData.email, 
        userType: formData.userType,
        skillCount: formData.skills.length 
      });

      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        userType: formData.userType,
        skills: formData.skills,
        bio: formData.bio,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null
      });

      logger.info('Registration successful');
      navigate('/dashboard');
      
    } catch (err) {
      logger.error('Registration failed', { error: err.message });
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Basic Information';
      case 2: return 'Account Security';
      case 3: return 'Profile Setup';
      case 4: return 'Final Step';
      default: return 'Registration';
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1: return 'Tell us about yourself';
      case 2: return 'Create a secure password';
      case 3: return 'Set up your profile';
      case 4: return 'Review and complete';
      default: return '';
    }
  };

  return (
    <div className="register-page">
      {/* Background Animation */}
      <div className="register-background">
        <div className="floating-particles">
          {[...Array(25)].map((_, i) => (
            <div key={i} className="particle" style={{
              '--delay': `${i * 0.4}s`,
              '--duration': `${4 + Math.random() * 3}s`
            }}></div>
          ))}
        </div>
      </div>

      <div className="register-container">
        {/* Left Side - Branding */}
        <div className="register-branding">
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

            {/* Registration Benefits */}
            <div className="benefits-preview">
              <h2>Join our growing community</h2>
              <div className="benefit-list">
                <div className="benefit-item">
                  <div className="benefit-icon">🚀</div>
                  <div className="benefit-content">
                    <h3>Start Earning Today</h3>
                    <p>Monetize your skills and help others with their tasks</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">🌟</div>
                  <div className="benefit-content">
                    <h3>Build Your Reputation</h3>
                    <p>Gain recognition and grow your professional network</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">🤝</div>
                  <div className="benefit-content">
                    <h3>Flexible Working</h3>
                    <p>Choose when and how you want to work</p>
                  </div>
                </div>
                <div className="benefit-item">
                  <div className="benefit-icon">🎯</div>
                  <div className="benefit-content">
                    <h3>Perfect Matches</h3>
                    <p>Our algorithm connects you with the right opportunities</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Registration Form */}
        <div className="register-form-container">
          <div className="register-form-content">
            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(step / 4) * 100}%` }}
                ></div>
              </div>
              <div className="progress-steps">
                {[1, 2, 3, 4].map(num => (
                  <div 
                    key={num}
                    className={`progress-step ${step >= num ? 'active' : ''} ${step === num ? 'current' : ''}`}
                  >
                    {step > num ? '✓' : num}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-header">
              <h2>{getStepTitle()}</h2>
              <p>{getStepDescription()}</p>
            </div>

            {error && (
              <div className="alert alert-error">
                <div className="alert-icon">⚠️</div>
                <div className="alert-message">{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="register-form">
              {/* Step 1: Basic Information */}
              {step === 1 && (
                <div className="form-step fade-in">
                  <div className="form-group">
                    <label htmlFor="name" className="form-label">
                      Full Name
                    </label>
                    <div className="input-wrapper">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        className="form-control"
                        required
                        disabled={loading}
                      />
                      <div className="input-icon">👤</div>
                    </div>
                  </div>

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
                </div>
              )}

              {/* Step 2: Password */}
              {step === 2 && (
                <div className="form-step fade-in">
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
                        placeholder="Create a strong password"
                        className="form-control"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <div className="password-hint">
                      At least 8 characters with numbers and letters
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirm Password
                    </label>
                    <div className="input-wrapper">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        className="form-control"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={loading}
                      >
                        {showConfirmPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Profile Setup */}
              {step === 3 && (
                <div className="form-step fade-in">
                  <div className="form-group">
                    <label className="form-label">I want to</label>
                    <UserTypeSelector
                      selectedType={formData.userType}
                      onTypeChange={(type) => setFormData(prev => ({ ...prev, userType: type }))}
                    />
                  </div>

                  {formData.userType === 'helper' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Your Skills</label>
                        <div className="skills-grid">
                          {skillOptions.map(skill => (
                            <button
                              key={skill}
                              type="button"
                              className={`skill-chip ${formData.skills.includes(skill) ? 'selected' : ''}`}
                              onClick={() => handleSkillToggle(skill)}
                              disabled={loading}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="hourlyRate" className="form-label">
                          Hourly Rate (Credits)
                        </label>
                        <div className="input-wrapper">
                          <input
                            type="number"
                            id="hourlyRate"
                            name="hourlyRate"
                            value={formData.hourlyRate}
                            onChange={handleChange}
                            placeholder="e.g., 25"
                            className="form-control"
                            min="1"
                            disabled={loading}
                          />
                          <div className="input-icon">💰</div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label htmlFor="bio" className="form-label">
                      Brief Bio (Optional)
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Tell us about yourself and your experience..."
                      className="form-control"
                      rows="3"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Terms and Completion */}
              {step === 4 && (
                <div className="form-step fade-in">
                  <div className="completion-summary">
                    <h3>Almost done!</h3>
                    <div className="summary-item">
                      <strong>Name:</strong> {formData.name}
                    </div>
                    <div className="summary-item">
                      <strong>Email:</strong> {formData.email}
                    </div>
                    <div className="summary-item">
                      <strong>Role:</strong> {formData.userType === 'helper' ? 'Helper' : 'Task Provider'}
                    </div>
                    {formData.userType === 'helper' && formData.skills.length > 0 && (
                      <div className="summary-item">
                        <strong>Skills:</strong> {formData.skills.join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        name="agreeTerms"
                        checked={formData.agreeTerms}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      <span className="checkmark"></span>
                      I agree to the{' '}
                      <Link to="/terms" target="_blank" className="terms-link">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" target="_blank" className="terms-link">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>
                </div>
              )}

              {/* Form Navigation */}
              <div className="form-navigation">
                {step > 1 && (
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={prevStep}
                    disabled={loading}
                  >
                    ← Previous
                  </button>
                )}
                
                {step < 4 ? (
                  <button 
                    type="button"
                    className="btn btn-primary btn-next"
                    onClick={nextStep}
                    disabled={loading}
                  >
                    Next →
                  </button>
                ) : (
                  <button 
                    type="submit"
                    className="btn btn-primary btn-complete"
                    disabled={loading || !formData.agreeTerms}
                  >
                    {loading ? (
                      <>
                        <div className="loading-spinner"></div>
                        Creating Account...
                      </>
                    ) : (
                      <>
                        Create Account
                        <span className="btn-arrow">🚀</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>

            <div className="form-footer">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="login-link">
                  Sign in to TimeSlice
                </Link>
              </p>
            </div>

            {/* Professional Footer */}
            <div className="register-footer">
              <p>&copy; 2024 TimeSlice. Join the future of work.</p>
              <div className="footer-links">
                <Link to="/help">Help Center</Link>
                <Link to="/about">About Us</Link>
                <Link to="/contact">Contact</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;