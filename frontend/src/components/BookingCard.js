import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/durationUtils';
import FileUpload from './FileUpload';
import DeliverableViewer from './DeliverableViewer';

const BookingCard = ({ booking, onReviewSubmit, onStatusUpdate }) => {
  const { currentUser } = useAuth();
  const [workNote, setWorkNote] = useState('');
  const [githubLinks, setGithubLinks] = useState([{ url: '', description: '' }]);
  const [additionalLinks, setAdditionalLinks] = useState([{ url: '', description: '' }]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showWorkSubmission, setShowWorkSubmission] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const isHelper = booking.helper._id === currentUser.id;
  const isTaskProvider = booking.taskProvider._id === currentUser.id;

  const handleStatusUpdate = async (newStatus) => {
    if (onStatusUpdate) {
      const deliverables = newStatus === 'work-submitted' ? {
        files: uploadedFiles,
        githubLinks: githubLinks.filter(link => link.url.trim()),
        additionalLinks: additionalLinks.filter(link => link.url.trim())
      } : undefined;

      await onStatusUpdate(booking._id, newStatus, workNote, deliverables);
    }
    setShowWorkSubmission(false);
    resetSubmissionForm();
  };

  const resetSubmissionForm = () => {
    setWorkNote('');
    setUploadedFiles([]);
    setGithubLinks([{ url: '', description: '' }]);
    setAdditionalLinks([{ url: '', description: '' }]);
  };

  const addGithubLink = () => {
    setGithubLinks([...githubLinks, { url: '', description: '' }]);
  };

  const removeGithubLink = (index) => {
    setGithubLinks(githubLinks.filter((_, i) => i !== index));
  };

  const updateGithubLink = (index, field, value) => {
    const updated = githubLinks.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    );
    setGithubLinks(updated);
  };

  const addAdditionalLink = () => {
    setAdditionalLinks([...additionalLinks, { url: '', description: '' }]);
  };

  const removeAdditionalLink = (index) => {
    setAdditionalLinks(additionalLinks.filter((_, i) => i !== index));
  };

  const updateAdditionalLink = (index, field, value) => {
    const updated = additionalLinks.map((link, i) => 
      i === index ? { ...link, [field]: value } : link
    );
    setAdditionalLinks(updated);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#28a745';
      case 'in-progress': return '#6f42c1';
      case 'confirmed': return '#17a2b8';
      case 'work-submitted': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🚀';
      case 'confirmed': return '📋';
      case 'work-submitted': return '📤';
      case 'cancelled': return '❌';
      default: return '📝';
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-1">
        <h3>{booking.taskId.title}</h3>
        <span 
          className="badge" 
          style={{ backgroundColor: getStatusColor(booking.status) }}
        >
          {getStatusIcon(booking.status)} {booking.status}
        </span>
      </div>
      
      <div className="mb-1">
        <strong>Description:</strong> 
        <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
          {booking.taskId.description.length > 100 
            ? booking.taskId.description.substring(0, 100) + '...' 
            : booking.taskId.description}
        </p>
      </div>
      
      <div className="mb-1">
        <strong>Scheduled Time:</strong> {formatDate(booking.taskId.dateTime)}
      </div>
      
      <div className="mb-1">
        <strong>Duration:</strong> {formatDuration(booking.taskId.duration)}
      </div>
      
      <div className="mb-1">
        <strong>Agreed Credits:</strong> {booking.agreedCredits}
      </div>
      
      <div className="mb-1">
        <strong>Task Provider:</strong> {booking.taskProvider.username}
        {booking.taskProvider.rating && (
          <span className="rating ml-1">
            ★ {booking.taskProvider.rating.toFixed(1)}
          </span>
        )}
      </div>
      
      <div className="mb-1">
        <strong>Helper:</strong> {booking.helper.username}
        {booking.helper.rating && (
          <span className="rating ml-1">
            ★ {booking.helper.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Booking Dates */}
      {booking.startedAt && (
        <div className="mb-1">
          <strong>Started:</strong> {formatDate(booking.startedAt)}
        </div>
      )}

      {booking.completedAt && (
        <div className="mb-1">
          <strong>Completed:</strong> {formatDate(booking.completedAt)}
        </div>
      )}

      {/* Work Submission Note Preview */}
      {booking.workSubmissionNote && (
        <div className="mb-1">
          <strong>Work Submission Note:</strong>
          <div style={{ 
            background: '#fff3cd', 
            padding: '0.75rem', 
            borderRadius: '4px',
            marginTop: '0.25rem',
            border: '1px solid #ffeaa7',
            fontSize: '0.9rem'
          }}>
            {booking.workSubmissionNote.length > 80 
              ? `"${booking.workSubmissionNote.substring(0, 80)}..."` 
              : `"${booking.workSubmissionNote}"`}
          </div>
        </div>
      )}

      {/* Deliverables Preview */}
      {booking.deliverables && (
        <div className="mb-1">
          <strong>Deliverables:</strong>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            marginTop: '0.5rem',
            flexWrap: 'wrap' 
          }}>
            {booking.deliverables.files?.length > 0 && (
              <span className="badge" style={{ backgroundColor: '#28a745' }}>
                📎 {booking.deliverables.files.length} file{booking.deliverables.files.length !== 1 ? 's' : ''}
              </span>
            )}
            {booking.deliverables.githubLinks?.length > 0 && (
              <span className="badge" style={{ backgroundColor: '#6f42c1' }}>
                🐙 {booking.deliverables.githubLinks.length} GitHub link{booking.deliverables.githubLinks.length !== 1 ? 's' : ''}
              </span>
            )}
            {booking.deliverables.additionalLinks?.length > 0 && (
              <span className="badge" style={{ backgroundColor: '#17a2b8' }}>
                🔗 {booking.deliverables.additionalLinks.length} additional link{booking.deliverables.additionalLinks.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status Update Buttons for Helper */}
      {isHelper && booking.status === 'confirmed' && (
        <div className="flex gap-1 mb-1">
          <button 
            onClick={() => handleStatusUpdate('in-progress')}
            className="btn btn-success"
          >
            🚀 Start Working
          </button>
          <button 
            onClick={() => handleStatusUpdate('cancelled')}
            className="btn btn-danger"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Enhanced Work Submission for Helper */}
      {isHelper && booking.status === 'in-progress' && (
        <div className="mb-1">
          {!showWorkSubmission ? (
            <button 
              onClick={() => setShowWorkSubmission(true)}
              className="btn btn-success"
              style={{ width: '100%' }}
            >
              📤 Submit Completed Work
            </button>
          ) : (
            <div style={{ 
              padding: '1.5rem', 
              border: '2px solid #28a745', 
              borderRadius: '8px',
              backgroundColor: '#f8fff8'
            }}>
              <h4>📤 Submit Your Work</h4>
              
              {/* Work Summary */}
              <div className="form-group">
                <label>Work Summary & Notes:</label>
                <textarea
                  value={workNote}
                  onChange={(e) => setWorkNote(e.target.value)}
                  placeholder="Describe what you've completed, key features, challenges overcome, next steps, or notes for the task provider..."
                  rows="3"
                  required
                />
              </div>

              {/* File Upload */}
              <FileUpload 
                onFilesUploaded={setUploadedFiles}
                maxFiles={10}
              />

              {/* GitHub Links */}
              <div className="form-group">
                <label>GitHub Repository Links (optional):</label>
                {githubLinks.map((link, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    marginBottom: '0.5rem',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateGithubLink(index, 'url', e.target.value)}
                        placeholder="https://github.com/username/repository"
                        style={{ marginBottom: '0.25rem' }}
                      />
                      <input
                        type="text"
                        value={link.description}
                        onChange={(e) => updateGithubLink(index, 'description', e.target.value)}
                        placeholder="Brief description (optional)"
                      />
                    </div>
                    {githubLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeGithubLink(index)}
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addGithubLink}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                >
                  ➕ Add GitHub Link
                </button>
              </div>

              {/* Additional Links */}
              <div className="form-group">
                <label>Additional Links (optional):</label>
                <small style={{ color: '#666', display: 'block', marginBottom: '0.5rem' }}>
                  Live demos, documentation, design files, etc.
                </small>
                {additionalLinks.map((link, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    gap: '0.5rem', 
                    marginBottom: '0.5rem',
                    alignItems: 'flex-end'
                  }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateAdditionalLink(index, 'url', e.target.value)}
                        placeholder="https://example.com"
                        style={{ marginBottom: '0.25rem' }}
                      />
                      <input
                        type="text"
                        value={link.description}
                        onChange={(e) => updateAdditionalLink(index, 'description', e.target.value)}
                        placeholder="Description (e.g., Live Demo, Documentation)"
                      />
                    </div>
                    {additionalLinks.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAdditionalLink(index)}
                        className="btn btn-danger"
                        style={{ padding: '0.25rem 0.5rem' }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAdditionalLink}
                  className="btn btn-secondary"
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                >
                  ➕ Add Link
                </button>
              </div>

              <div className="flex gap-1">
                <button 
                  onClick={() => handleStatusUpdate('work-submitted')}
                  className="btn btn-success"
                  disabled={!workNote.trim()}
                >
                  📤 Submit Work
                </button>
                <button 
                  onClick={() => {
                    setShowWorkSubmission(false);
                    resetSubmissionForm();
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Updates for Task Provider */}
      {isTaskProvider && booking.status === 'confirmed' && (
        <div className="mb-1">
          <button 
            onClick={() => handleStatusUpdate('cancelled')}
            className="btn btn-danger"
          >
            Cancel Booking
          </button>
        </div>
      )}

      {/* Work Submitted Status with Deliverables Preview */}
      {booking.status === 'work-submitted' && (
        <div className="mb-1" style={{ 
          backgroundColor: '#fff3cd', 
          padding: '1rem', 
          borderRadius: '8px',
          border: '1px solid #ffeaa7'
        }}>
          <strong>📤 Work Submitted by Helper</strong>
          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
            {isTaskProvider 
              ? 'Review the work and deliverables. Mark as completed in "My Tasks" when satisfied.'
              : 'Work submitted! Waiting for task provider to review and mark as completed.'
            }
          </p>
          
          {/* Quick Deliverables Summary */}
          {booking.deliverables && (
            <div style={{ marginTop: '0.5rem' }}>
              <DeliverableViewer 
                deliverables={booking.deliverables} 
                canDownload={isTaskProvider}
              />
            </div>
          )}
        </div>
      )}

      {/* Chat Button */}
      {booking.chatId && ['confirmed', 'in-progress', 'work-submitted', 'completed'].includes(booking.status) && (
        <div className="mb-1">
          <Link 
            to="/chat" 
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            💬 Open Chat
          </Link>
        </div>
      )}
      
      {/* Reviews Summary */}
      {booking.status === 'completed' && (
        <div className="mt-1">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
            {/* Helper Review Summary */}
            <div style={{ 
              padding: '0.75rem', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              border: '1px solid #e1e5e9',
              textAlign: 'center'
            }}>
              <strong>Helper's Review</strong>
              {booking.helperReview.rating ? (
                <div>
                  <span className="rating">★ {booking.helperReview.rating}/5</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                    {booking.helperReview.review.length > 30 
                      ? `"${booking.helperReview.review.substring(0, 30)}..."` 
                      : `"${booking.helperReview.review}"`}
                  </p>
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Not reviewed</div>
              )}
            </div>
            
            {/* Task Provider Review Summary */}
            <div style={{ 
              padding: '0.75rem', 
              backgroundColor: '#f8f9fa', 
              borderRadius: '4px',
              border: '1px solid #e1e5e9',
              textAlign: 'center'
            }}>
              <strong>Provider's Review</strong>
              {booking.taskProviderReview.rating ? (
                <div>
                  <span className="rating">★ {booking.taskProviderReview.rating}/5</span>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                    {booking.taskProviderReview.review.length > 30 
                      ? `"${booking.taskProviderReview.review.substring(0, 30)}..."` 
                      : `"${booking.taskProviderReview.review}"`}
                  </p>
                </div>
              ) : (
                <div style={{ color: '#666', fontSize: '0.9rem' }}>Not reviewed</div>
              )}
            </div>
          </div>

          {/* Review Action Button */}
          {((isHelper && !booking.helperReview.rating) || 
            (isTaskProvider && !booking.taskProviderReview.rating)) && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                backgroundColor: '#e3f2fd', 
                padding: '0.75rem', 
                borderRadius: '4px',
                marginBottom: '0.75rem',
                border: '1px solid #bbdefb'
              }}>
                <strong>⭐ Review Needed</strong>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>
                  Click "View Full Details" to leave your review
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BookingCard;