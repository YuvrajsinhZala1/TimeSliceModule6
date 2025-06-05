import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import api from '../utils/api';

const HelperProfileModal = ({ helper, application, isOpen, onClose, onRespond }) => {
  const navigate = useNavigate();
  const { joinChat } = useChat();
  const [startingChat, setStartingChat] = useState(false);

  if (!isOpen || !helper) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getExperienceLevel = (completedTasks, memberSince) => {
    const monthsSince = Math.floor((new Date() - new Date(memberSince)) / (1000 * 60 * 60 * 24 * 30));
    
    if (completedTasks >= 50) return 'Expert';
    if (completedTasks >= 20) return 'Experienced';
    if (completedTasks >= 5) return 'Intermediate';
    if (monthsSince >= 3) return 'Beginner';
    return 'New Member';
  };

  const handleStartChat = async () => {
    if (!application) return;
    
    setStartingChat(true);
    try {
      // Create or get existing discussion chat
      const response = await api.post('/chat/create-discussion', {
        taskId: application.taskId._id || application.taskId,
        participantId: helper._id
      });

      // Close modal and navigate to chat
      onClose();
      
      // Join the chat and navigate
      joinChat(response.data);
      navigate('/chat');
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#666'
          }}
        >
          ✕
        </button>

        {/* Helper Profile Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#667eea',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: 'bold',
            margin: '0 auto 1rem'
          }}>
            {helper.username.charAt(0).toUpperCase()}
          </div>
          <h2>{helper.username}</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <span className="rating">
              ★ {helper.rating ? helper.rating.toFixed(1) : 'New'}
            </span>
            <span className="badge">
              {getExperienceLevel(helper.completedTasks, helper.createdAt)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '1rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
              {helper.completedTasks || 0}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Tasks Completed</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
              {helper.totalRatings || 0}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Reviews</div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>
              {formatDate(helper.createdAt)}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Member Since</div>
          </div>
        </div>

        {/* Bio */}
        {helper.bio && (
          <div style={{ marginBottom: '2rem' }}>
            <h3>About</h3>
            <p style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px',
              lineHeight: '1.6',
              color: '#333'
            }}>
              {helper.bio}
            </p>
          </div>
        )}

        {/* Skills */}
        {helper.skills && helper.skills.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <h3>Skills</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {helper.skills.map((skill, index) => (
                <span key={index} className="badge" style={{ fontSize: '0.9rem' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Application Details */}
        {application && (
          <div style={{ marginBottom: '2rem' }}>
            <h3>Application Details</h3>
            
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px',
              marginBottom: '1rem'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Proposed Credits:</strong> {application.proposedCredits}
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>Applied:</strong> {formatDate(application.createdAt)}
              </div>
              <div>
                <strong>Message:</strong>
                <div style={{ 
                  fontStyle: 'italic', 
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #e1e5e9'
                }}>
                  "{application.message}"
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat Option */}
        {application && application.status === 'pending' && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ 
              backgroundColor: '#e3f2fd', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid #bbdefb'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}>💬 Want to discuss first?</h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>
                Chat with {helper.username} before making a decision. Ask questions about their approach, 
                timeline, or clarify requirements.
              </p>
              <button
                onClick={handleStartChat}
                disabled={startingChat}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                {startingChat ? '💬 Starting Chat...' : '💬 Start Discussion Chat'}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {application && application.status === 'pending' && onRespond && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              onClick={() => onRespond(application._id, 'accepted', application.proposedCredits)}
              className="btn btn-success"
              style={{ minWidth: '120px' }}
            >
              Accept Application
            </button>
            <button
              onClick={() => onRespond(application._id, 'rejected')}
              className="btn btn-danger"
              style={{ minWidth: '120px' }}
            >
              Reject Application
            </button>
          </div>
        )}

        {application && application.status !== 'pending' && (
          <div style={{ textAlign: 'center' }}>
            <span 
              className="badge" 
              style={{ 
                fontSize: '1rem',
                backgroundColor: application.status === 'accepted' ? '#28a745' : '#dc3545'
              }}
            >
              Application {application.status}
            </span>
          </div>
        )}

        {/* No Application (just viewing profile) */}
        {!application && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px',
              color: '#666'
            }}>
              Viewing {helper.username}'s profile
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelperProfileModal;