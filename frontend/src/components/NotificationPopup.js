import React, { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';

const NotificationPopup = () => {
  const { showPopup, currentPopupNotification, closePopup, handlePopupAction } = useNotification();

  // Auto-close popup after 10 seconds
  useEffect(() => {
    if (showPopup) {
      const timer = setTimeout(() => {
        closePopup();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [showPopup, closePopup]);

  if (!showPopup || !currentPopupNotification) {
    return null;
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'work_submitted': return '📤';
      case 'application_received': return '📥';
      case 'task_completed': return '✅';
      case 'application_accepted': return '🎉';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'work_submitted': return '#ffc107';
      case 'application_received': return '#17a2b8';
      case 'task_completed': return '#28a745';
      case 'application_accepted': return '#28a745';
      default: return '#007bff';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '100px',
      right: '20px',
      width: '350px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      border: `3px solid ${getNotificationColor(currentPopupNotification.type)}`,
      zIndex: 10000,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      {/* Header */}
      <div style={{
        padding: '1rem 1rem 0.5rem 1rem',
        borderBottom: '1px solid #e1e5e9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.5rem' }}>
            {getNotificationIcon(currentPopupNotification.type)}
          </span>
          <h4 style={{ margin: 0, color: getNotificationColor(currentPopupNotification.type) }}>
            {currentPopupNotification.title}
          </h4>
        </div>
        <button
          onClick={closePopup}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            color: '#666',
            padding: '0.2rem'
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '1rem' }}>
        <p style={{ margin: '0 0 1rem 0', lineHeight: '1.5' }}>
          {currentPopupNotification.message}
        </p>

        {/* Metadata */}
        {currentPopupNotification.metadata && (
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '0.75rem', 
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.9rem'
          }}>
            {currentPopupNotification.metadata.taskTitle && (
              <div><strong>Task:</strong> {currentPopupNotification.metadata.taskTitle}</div>
            )}
            {currentPopupNotification.metadata.helperName && (
              <div><strong>Helper:</strong> {currentPopupNotification.metadata.helperName}</div>
            )}
            {currentPopupNotification.metadata.hasFiles && (
              <div style={{ color: '#28a745' }}>📎 Files included</div>
            )}
            {currentPopupNotification.metadata.hasGithubLinks && (
              <div style={{ color: '#6f42c1' }}>🔗 GitHub links included</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => handlePopupAction('dismiss')}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
          >
            Dismiss
          </button>
          {currentPopupNotification.actionRequired && (
            <button
              onClick={() => handlePopupAction('view')}
              className="btn btn-success"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              Review Now
            </button>
          )}
        </div>
      </div>

      {/* Progress bar for auto-close */}
      <div style={{
        height: '3px',
        backgroundColor: '#e1e5e9',
        borderRadius: '0 0 12px 12px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          backgroundColor: getNotificationColor(currentPopupNotification.type),
          animation: 'progressBar 10s linear forwards'
        }} />
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default NotificationPopup;