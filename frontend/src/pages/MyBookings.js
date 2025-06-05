import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import BookingCard from '../components/BookingCard';
import BookingDetailsModal from '../components/BookingDetailsModal';

const MyBookings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    fetchBookings();
  }, [currentUser, navigate]);

  const fetchBookings = async () => {
    try {
      const response = await api.get('/bookings');
      setBookings(response.data);
    } catch (error) {
      setError('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus, workNote = '') => {
    try {
      setError('');
      setSuccess('');
      
      await api.put(`/bookings/${bookingId}/status`, { 
        status: newStatus,
        workNote 
      });
      setSuccess(`Task status updated to ${newStatus}!`);
      
      // Update booking in state
      setBookings(bookings.map(booking => 
        booking._id === bookingId 
          ? { ...booking, status: newStatus, workSubmissionNote: workNote || booking.workSubmissionNote }
          : booking
      ));
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update status');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleReviewSubmit = async (bookingId, reviewData) => {
    try {
      setError('');
      setSuccess('');
      
      await api.post(`/bookings/review/${bookingId}`, reviewData);
      setSuccess('Review submitted successfully!');
      
      // Refresh bookings to get updated reviews
      fetchBookings();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit review');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedBooking(null);
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return <div className="text-center">Loading your bookings...</div>;
  }

  // Separate bookings by role
  const helperBookings = bookings.filter(b => b.helper._id === currentUser.id);
  const taskProviderBookings = bookings.filter(b => b.taskProvider._id === currentUser.id);

  // Filter by status
  const activeHelperBookings = helperBookings.filter(b => ['confirmed', 'in-progress', 'work-submitted'].includes(b.status));
  const completedHelperBookings = helperBookings.filter(b => b.status === 'completed');
  const cancelledHelperBookings = helperBookings.filter(b => b.status === 'cancelled');

  const activeProviderBookings = taskProviderBookings.filter(b => ['confirmed', 'in-progress', 'work-submitted'].includes(b.status));
  const completedProviderBookings = taskProviderBookings.filter(b => b.status === 'completed');
  const cancelledProviderBookings = taskProviderBookings.filter(b => b.status === 'cancelled');

  return (
    <div>
      <h1 className="mb-2">📋 My Bookings</h1>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      {bookings.length === 0 ? (
        <div className="card text-center">
          <h3>No bookings found</h3>
          <p>
            You don't have any bookings yet. Start by browsing tasks to help others 
            or posting tasks to get help yourself!
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button 
              onClick={() => navigate('/browse-tasks')}
              className="btn btn-success"
            >
              Browse Tasks to Help
            </button>
            <button 
              onClick={() => navigate('/create-task')}
              className="btn btn-secondary"
            >
              Post a Task
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Helper Bookings Section */}
          {helperBookings.length > 0 && (
            <div className="mb-2">
              <h2>🤝 Tasks I'm Helping With ({helperBookings.length})</h2>
              
              {/* Active Helper Tasks */}
              {activeHelperBookings.length > 0 && (
                <div className="mb-2">
                  <h3>Active Tasks ({activeHelperBookings.length})</h3>
                  <div className="card-grid">
                    {activeHelperBookings.map(booking => (
                      <div key={booking._id}>
                        <BookingCard
                          booking={booking}
                          onStatusUpdate={handleStatusUpdate}
                          onReviewSubmit={handleReviewSubmit}
                        />
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="btn btn-secondary"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          📄 View Full Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Helper Tasks */}
              {completedHelperBookings.length > 0 && (
                <div className="mb-2">
                  <h3>Completed Tasks ({completedHelperBookings.length})</h3>
                  <div className="card-grid">
                    {completedHelperBookings.map(booking => (
                      <div key={booking._id}>
                        <BookingCard
                          booking={booking}
                          onStatusUpdate={handleStatusUpdate}
                          onReviewSubmit={handleReviewSubmit}
                        />
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="btn btn-secondary"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          📄 View Details & Reviews
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancelled Helper Tasks */}
              {cancelledHelperBookings.length > 0 && (
                <div className="mb-2">
                  <h3>Cancelled Tasks ({cancelledHelperBookings.length})</h3>
                  <div className="card-grid">
                    {cancelledHelperBookings.map(booking => (
                      <div key={booking._id}>
                        <BookingCard
                          booking={booking}
                          onStatusUpdate={handleStatusUpdate}
                          onReviewSubmit={handleReviewSubmit}
                        />
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="btn btn-secondary"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          📄 View Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Provider Bookings Section */}
          {taskProviderBookings.length > 0 && (
            <div className="mb-2">
              <h2>📋 My Posted Tasks with Selected Helpers ({taskProviderBookings.length})</h2>
              
              {/* Active Provider Tasks */}
              {activeProviderBookings.length > 0 && (
                <div className="mb-2">
                  <h3>Active Tasks ({activeProviderBookings.length})</h3>
                  <div className="card-grid">
                    {activeProviderBookings.map(booking => (
                      <div key={booking._id}>
                        <BookingCard
                          booking={booking}
                          onStatusUpdate={handleStatusUpdate}
                          onReviewSubmit={handleReviewSubmit}
                        />
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="btn btn-success"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          👥 View Selected Helper Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Provider Tasks */}
              {completedProviderBookings.length > 0 && (
                <div className="mb-2">
                  <h3>Completed Tasks ({completedProviderBookings.length})</h3>
                  <div className="card-grid">
                    {completedProviderBookings.map(booking => (
                      <div key={booking._id}>
                        <BookingCard
                          booking={booking}
                          onStatusUpdate={handleStatusUpdate}
                          onReviewSubmit={handleReviewSubmit}
                        />
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="btn btn-success"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          👥 View Helper & Reviews
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancelled Provider Tasks */}
              {cancelledProviderBookings.length > 0 && (
                <div className="mb-2">
                  <h3>Cancelled Tasks ({cancelledProviderBookings.length})</h3>
                  <div className="card-grid">
                    {cancelledProviderBookings.map(booking => (
                      <div key={booking._id}>
                        <BookingCard
                          booking={booking}
                          onStatusUpdate={handleStatusUpdate}
                          onReviewSubmit={handleReviewSubmit}
                        />
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="btn btn-secondary"
                          style={{ width: '100%', marginTop: '0.5rem' }}
                        >
                          📄 View Details
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Booking Details Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={showDetailsModal}
        onClose={handleCloseModal}
        onReviewSubmit={handleReviewSubmit}
      />

      {/* Tips Section */}
      <div className="card mt-2" style={{ backgroundColor: '#f8f9fa' }}>
        <h4>💡 Booking Tips:</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div>
            <strong>As a Helper:</strong>
            <ul style={{ marginLeft: '1rem', color: '#666' }}>
              <li>Start tasks promptly and communicate regularly</li>
              <li>Submit your work with detailed notes</li>
              <li>Leave honest reviews for task providers</li>
              <li>Use chat to clarify requirements</li>
            </ul>
          </div>
          <div>
            <strong>As a Task Provider:</strong>
            <ul style={{ marginLeft: '1rem', color: '#666' }}>
              <li>Review submitted work carefully</li>
              <li>Provide feedback and mark tasks complete when satisfied</li>
              <li>Leave helpful reviews for helpers</li>
              <li>Communicate expectations clearly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyBookings;