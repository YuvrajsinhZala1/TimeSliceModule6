import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/durationUtils';
import DeliverableViewer from './DeliverableViewer';
import api from '../utils/api';

const BookingDetailsModal = ({ booking, isOpen, onClose, onReviewSubmit }) => {
  const { currentUser } = useAuth();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    review: ''
  });

  useEffect(() => {
    if (isOpen && booking) {
      fetchBookingDetails();
    }
  }, [isOpen, booking]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bookings/${booking._id}`);
      setBookingDetails(response.data);
    } catch (error) {
      console.error('Error fetching booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await onReviewSubmit(booking._id, reviewData);
      setShowReviewForm(false);
      setReviewData({ rating: 5, review: '' });
      // Refresh booking details
      await fetchBookingDetails();
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  if (!isOpen || !booking) return null;

  const isHelper = booking.helper._id === currentUser.id;
  const isTaskProvider = booking.taskProvider._id === currentUser.id;
  const otherUser = isHelper ? booking.taskProvider : booking.helper;

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
        maxWidth: '800px',
        width: '90%',
        maxHeight: '85vh',
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

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Loading booking details...
          </div>
        ) : bookingDetails ? (
          <>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h2>{bookingDetails.taskId.title}</h2>
              <span 
                className="badge" 
                style={{ 
                  fontSize: '1rem',
                  backgroundColor: bookingDetails.status === 'completed' ? '#28a745' : '#007bff'
                }}
              >
                {bookingDetails.status}
              </span>
            </div>

            {/* Task Details */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3>📋 Task Details</h3>
              <p><strong>Description:</strong> {bookingDetails.taskId.description}</p>
              <p><strong>Scheduled Time:</strong> {formatDate(bookingDetails.taskId.dateTime)}</p>
              <p><strong>Duration:</strong> {formatDuration(bookingDetails.taskId.duration)}</p>
              <p><strong>Agreed Credits:</strong> {bookingDetails.agreedCredits}</p>
              
              {bookingDetails.startedAt && (
                <p><strong>Started:</strong> {formatDate(bookingDetails.startedAt)}</p>
              )}
              
              {bookingDetails.completedAt && (
                <p><strong>Completed:</strong> {formatDate(bookingDetails.completedAt)}</p>
              )}
            </div>

            {/* Participant Details */}
            <div className="card" style={{ marginBottom: '2rem' }}>
              <h3>👤 {isHelper ? 'Task Provider' : 'Helper'} Details</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#667eea',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  {otherUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4>{otherUser.username}</h4>
                  <span className="rating">
                    ★ {otherUser.rating ? otherUser.rating.toFixed(1) : 'New'}
                  </span>
                  <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                    {otherUser.completedTasks || 0} tasks completed
                  </p>
                  {otherUser.bio && (
                    <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic' }}>
                      "{otherUser.bio}"
                    </p>
                  )}
                </div>
              </div>
              
              {otherUser.skills && otherUser.skills.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <strong>Skills:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {otherUser.skills.map((skill, index) => (
                      <span key={index} className="badge" style={{ fontSize: '0.8rem' }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Work Submission Note */}
            {bookingDetails.workSubmissionNote && (
              <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#fff3cd' }}>
                <h4>📝 Work Submission Note</h4>
                <p style={{ margin: 0, fontStyle: 'italic' }}>
                  "{bookingDetails.workSubmissionNote}"
                </p>
                <small style={{ color: '#856404' }}>
                  Submitted: {formatDate(bookingDetails.updatedAt)}
                </small>
              </div>
            )}

            {/* Deliverables Section */}
            {bookingDetails.deliverables && (
              <div style={{ marginBottom: '2rem' }}>
                <DeliverableViewer 
                  deliverables={bookingDetails.deliverables}
                  canDownload={isTaskProvider}
                />
              </div>
            )}

            {/* Provider Acceptance Note */}
            {bookingDetails.providerAcceptanceNote && (
              <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#d4edda' }}>
                <h4>✅ Completion Note</h4>
                <p style={{ margin: 0, fontStyle: 'italic' }}>
                  "{bookingDetails.providerAcceptanceNote}"
                </p>
                <small style={{ color: '#155724' }}>
                  Completed: {formatDate(bookingDetails.completedAt)}
                </small>
              </div>
            )}

            {/* Reviews Section */}
            {bookingDetails.status === 'completed' && (
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h3>⭐ Reviews</h3>
                
                {/* Helper's Review */}
                {bookingDetails.helperReview.review && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h4>Helper's Review of Task Provider</h4>
                    <div className="rating" style={{ marginBottom: '0.5rem' }}>
                      ★ {bookingDetails.helperReview.rating}/5
                    </div>
                    <p style={{ margin: 0, fontStyle: 'italic' }}>
                      "{bookingDetails.helperReview.review}"
                    </p>
                  </div>
                )}
                
                {/* Task Provider's Review */}
                {bookingDetails.taskProviderReview.review && (
                  <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h4>Task Provider's Review of Helper</h4>
                    <div className="rating" style={{ marginBottom: '0.5rem' }}>
                      ★ {bookingDetails.taskProviderReview.rating}/5
                    </div>
                    <p style={{ margin: 0, fontStyle: 'italic' }}>
                      "{bookingDetails.taskProviderReview.review}"
                    </p>
                  </div>
                )}

                {/* Review Form */}
                {((isHelper && !bookingDetails.helperReview.rating) || 
                  (isTaskProvider && !bookingDetails.taskProviderReview.rating)) && (
                  <>
                    {!showReviewForm ? (
                      <button 
                        onClick={() => setShowReviewForm(true)}
                        className="btn btn-success"
                      >
                        ⭐ Leave Review
                      </button>
                    ) : (
                      <form onSubmit={handleReviewSubmit} style={{ 
                        padding: '1rem', 
                        border: '2px solid #28a745', 
                        borderRadius: '8px',
                        backgroundColor: '#f8fff8'
                      }}>
                        <h4>Leave Your Review</h4>
                        
                        <div className="form-group">
                          <label>Rating:</label>
                          <select 
                            value={reviewData.rating} 
                            onChange={(e) => setReviewData({...reviewData, rating: parseInt(e.target.value)})}
                          >
                            <option value={5}>5 - Excellent</option>
                            <option value={4}>4 - Good</option>
                            <option value={3}>3 - Average</option>
                            <option value={2}>2 - Poor</option>
                            <option value={1}>1 - Very Poor</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label>Review:</label>
                          <textarea
                            value={reviewData.review}
                            onChange={(e) => setReviewData({...reviewData, review: e.target.value})}
                            placeholder="Share your experience working together..."
                            required
                            rows="3"
                          />
                        </div>
                        
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <button type="submit" className="btn btn-success">
                            Submit Review
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setShowReviewForm(false)}
                            className="btn btn-secondary"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </>
                )}

                {/* No review message */}
                {!bookingDetails.helperReview.rating && !bookingDetails.taskProviderReview.rating && (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    color: '#666'
                  }}>
                    No reviews yet. Be the first to leave a review!
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {bookingDetails.chatId && (
                <Link 
                  to="/chat" 
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  💬 Open Chat
                </Link>
              )}
              
              {/* Deliverables Management for Helper */}
              {isHelper && bookingDetails.status === 'in-progress' && (
                <button 
                  onClick={() => {
                    onClose();
                    // Navigate to main booking page for work submission
                    window.location.href = '/my-bookings';
                  }}
                  className="btn btn-success"
                >
                  📤 Submit Work
                </button>
              )}

              {/* Task Completion for Provider */}
              {isTaskProvider && bookingDetails.status === 'work-submitted' && (
                <button 
                  onClick={() => {
                    onClose();
                    // Navigate to My Tasks for completion
                    window.location.href = '/my-tasks';
                  }}
                  className="btn btn-success"
                >
                  ✅ Review & Complete Task
                </button>
              )}

              <button onClick={onClose} className="btn">
                Close
              </button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Error loading booking details
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingDetailsModal;