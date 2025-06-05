import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import api from '../utils/api';
import TaskCard from '../components/TaskCard';
import ApplicantsList from '../components/ApplicantsList';
import TaskCompletionModal from '../components/TaskCompletionModal';
import DeliverableViewer from '../components/DeliverableViewer';

const MyTasks = () => {
  const { currentUser } = useAuth();
  const { fetchNotifications } = useNotification();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showApplications, setShowApplications] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [showDeliverables, setShowDeliverables] = useState(false);
  const [selectedTaskDeliverables, setSelectedTaskDeliverables] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    fetchMyTasks();
  }, [currentUser, navigate]);

  const fetchMyTasks = async () => {
    try {
      const response = await api.get('/tasks/my-tasks');
      setTasks(response.data);
    } catch (error) {
      setError('Failed to fetch your tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (taskId) => {
    // For now, just show an alert. You can implement edit modal later
    alert('Edit functionality coming soon!');
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      await api.delete(`/tasks/${taskId}`);
      setSuccess('Task deleted successfully!');
      
      // Remove deleted task from list
      setTasks(tasks.filter(task => task._id !== taskId));
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete task');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleViewApplications = (task) => {
    setSelectedTask(task);
    setShowApplications(true);
  };

  const handleCompleteTask = (task) => {
    setTaskToComplete(task);
    setShowCompletionModal(true);
  };

  const handleViewDeliverables = async (task) => {
    try {
      // Fetch booking details to get deliverables
      const bookingResponse = await api.get('/bookings');
      const taskBooking = bookingResponse.data.find(booking => 
        booking.taskId._id === task._id && booking.status === 'work-submitted'
      );
      
      if (taskBooking && taskBooking.deliverables) {
        setSelectedTaskDeliverables({
          task: task,
          deliverables: taskBooking.deliverables,
          workNote: taskBooking.workSubmissionNote
        });
        setShowDeliverables(true);
      } else {
        alert('No deliverables found for this task');
      }
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      alert('Failed to load deliverables');
    }
  };

  const handleTaskCompletion = async (taskId, completionNote) => {
    try {
      setError('');
      setSuccess('');
      
      await api.put(`/tasks/${taskId}/complete`, { completionNote });
      setSuccess('Task marked as completed! Credits have been transferred to the helper.');
      
      // Refresh tasks
      await fetchMyTasks();
      
      // Refresh notifications to update any completion-related notifications
      await fetchNotifications();
      
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to complete task');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleRespondToApplication = async (applicationId, responseData) => {
    try {
      setError('');
      setSuccess('');
      
      await api.put(`/applications/${applicationId}/respond`, responseData);
      
      if (responseData.status === 'accepted') {
        setSuccess('Application accepted! A booking has been created and you can now chat with the helper.');
      } else {
        setSuccess('Application response sent.');
      }
      
      // Refresh tasks to get updated data
      await fetchMyTasks();
      
      // If viewing applications, refresh the selected task
      if (selectedTask) {
        const updatedTask = await api.get(`/tasks/${selectedTask._id}`);
        setSelectedTask(updatedTask.data);
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to respond to application');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return <div className="text-center">Loading your tasks...</div>;
  }

  if (showApplications && selectedTask) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h1>Applications for: {selectedTask.title}</h1>
          <button 
            onClick={() => setShowApplications(false)}
            className="btn btn-secondary"
          >
            ← Back to My Tasks
          </button>
        </div>
        
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
        
        <ApplicantsList 
          task={selectedTask}
          onRespondToApplication={handleRespondToApplication}
        />
      </div>
    );
  }

  const openTasks = tasks.filter(task => task.status === 'open');
  const inReviewTasks = tasks.filter(task => task.status === 'in-review');
  const assignedTasks = tasks.filter(task => ['assigned', 'in-progress'].includes(task.status));
  const completedTasks = tasks.filter(task => task.status === 'completed');

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h1>My Posted Tasks</h1>
        <Link to="/create-task" className="btn btn-success">
          Post New Task
        </Link>
      </div>
      
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      
      {tasks.length === 0 ? (
        <div className="card text-center">
          <h3>No tasks posted yet</h3>
          <p>Start by posting your first task to get help from the community!</p>
          <Link to="/create-task" className="btn btn-success">
            Post Your First Task
          </Link>
        </div>
      ) : (
        <>
          {/* Open Tasks */}
          {openTasks.length > 0 && (
            <div className="mb-2">
              <h2>📋 Open Tasks - Accepting Applications ({openTasks.length})</h2>
              <div className="card-grid">
                {openTasks.map(task => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    showApplyButton={false}
                    showEditDelete={true}
                    showViewApplications={true}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewApplications={handleViewApplications}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In Review Tasks */}
          {inReviewTasks.length > 0 && (
            <div className="mb-2">
              <h2>👀 Under Review ({inReviewTasks.length})</h2>
              <div className="card-grid">
                {inReviewTasks.map(task => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    showApplyButton={false}
                    showEditDelete={false}
                    showViewApplications={true}
                    onViewApplications={handleViewApplications}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Assigned/In Progress Tasks */}
          {assignedTasks.length > 0 && (
            <div className="mb-2">
              <h2>🚀 Active Tasks ({assignedTasks.length})</h2>
              <div className="card-grid">
                {assignedTasks.map(task => (
                  <div key={task._id} className="card">
                    <TaskCard
                      task={task}
                      showApplyButton={false}
                      showEditDelete={false}
                      showViewApplications={false}
                    />
                    
                    {/* Task Provider Controls */}
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '1rem', 
                      backgroundColor: '#f8f9fa', 
                      borderRadius: '8px',
                      border: '2px solid #28a745'
                    }}>
                      <h4 style={{ color: '#28a745', marginBottom: '0.5rem' }}>
                        {task.status === 'in-progress' ? '🚀 Task in Progress' : '📋 Task Assigned'}
                      </h4>
                      <p style={{ color: '#666', marginBottom: '1rem' }}>
                        Working with: <strong>{task.selectedHelper?.username}</strong>
                      </p>
                      
                      {/* Work Submitted Status */}
                      {task.completedByHelper && (
                        <div style={{ 
                          backgroundColor: '#d4edda', 
                          padding: '1rem', 
                          borderRadius: '4px',
                          marginBottom: '1rem',
                          border: '1px solid #c3e6cb'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <strong>🎉 Helper has completed their work!</strong>
                          </div>
                          <p style={{ margin: '0.5rem 0', fontSize: '0.9rem' }}>
                            Review the work and deliverables, then mark as completed when satisfied.
                          </p>
                          
                          {/* View Deliverables Button */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                            <button
                              onClick={() => handleViewDeliverables(task)}
                              className="btn btn-secondary"
                              style={{ flex: 1 }}
                            >
                              📦 View Submitted Work & Files
                            </button>
                          </div>
                        </div>
                      )}
                      
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="btn btn-success"
                        style={{ width: '100%' }}
                        disabled={!task.completedByHelper}
                      >
                        {task.completedByHelper 
                          ? '✅ Mark Task as Completed' 
                          : '⏳ Waiting for Helper to Submit Work'
                        }
                      </button>
                      
                      <small style={{ display: 'block', marginTop: '0.5rem', color: '#666', textAlign: 'center' }}>
                        {task.completedByHelper 
                          ? 'This will transfer credits to the helper and complete the task'
                          : 'Helper needs to submit their work before you can mark as completed'
                        }
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="mb-2">
              <h2>✅ Completed Tasks ({completedTasks.length})</h2>
              <div className="card-grid">
                {completedTasks.map(task => (
                  <div key={task._id} className="card" style={{ opacity: 0.8 }}>
                    <TaskCard
                      task={task}
                      showApplyButton={false}
                      showEditDelete={false}
                      showViewApplications={false}
                    />
                    
                    {task.completionNote && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '1rem', 
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '8px' 
                      }}>
                        <strong>Completion Notes:</strong>
                        <p style={{ margin: '0.5rem 0 0 0', fontStyle: 'italic' }}>
                          "{task.completionNote}"
                        </p>
                      </div>
                    )}
                    
                    {/* View Final Deliverables */}
                    <button
                      onClick={() => handleViewDeliverables(task)}
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: '1rem' }}
                    >
                      📁 View Final Deliverables
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Task Completion Modal */}
      <TaskCompletionModal
        task={taskToComplete}
        isOpen={showCompletionModal}
        onClose={() => {
          setShowCompletionModal(false);
          setTaskToComplete(null);
        }}
        onComplete={handleTaskCompletion}
      />

      {/* Deliverables Modal */}
      {showDeliverables && selectedTaskDeliverables && (
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
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowDeliverables(false)}
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

            <h2 style={{ marginBottom: '1rem' }}>
              📦 Deliverables for: {selectedTaskDeliverables.task.title}
            </h2>

            {selectedTaskDeliverables.workNote && (
              <div style={{ 
                backgroundColor: '#fff3cd', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '2rem',
                border: '1px solid #ffeaa7'
              }}>
                <h4>📝 Helper's Work Notes:</h4>
                <p style={{ margin: 0, fontStyle: 'italic' }}>
                  "{selectedTaskDeliverables.workNote}"
                </p>
              </div>
            )}

            <DeliverableViewer 
              deliverables={selectedTaskDeliverables.deliverables}
              canDownload={true}
            />

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={() => setShowDeliverables(false)}
                className="btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;