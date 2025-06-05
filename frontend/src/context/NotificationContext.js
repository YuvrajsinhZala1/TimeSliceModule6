// File: src/context/NotificationContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';

const NotificationContext = createContext();

// Debug logging utility
const debugLog = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    console.log(`[NotificationContext ${timestamp}] ${message}`, data || '');
    
    // Also log to file if needed (in production, you'd implement proper logging)
    try {
      const logEntry = {
        timestamp,
        component: 'NotificationContext',
        message,
        data: data || null
      };
      
      // Store in localStorage for debugging (in real app, use proper logging service)
      const logs = JSON.parse(localStorage.getItem('timeslice_logs') || '[]');
      logs.push(logEntry);
      
      // Keep only last 100 log entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('timeslice_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save log:', error);
    }
  }
};

// Custom hook to use notification context
const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user, socket } = useContext(AuthContext);

  debugLog('NotificationProvider rendered', { userId: user?.id, socketConnected: !!socket });

  // Load notifications when user changes
  useEffect(() => {
    if (!user) {
      debugLog('No user found, clearing notifications');
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }

    debugLog('Loading notifications for user', { userId: user.id });
    setLoading(true);
    setError(null);
    
    // Simulate loading notifications
    const timer = setTimeout(() => {
      try {
        debugLog('Generating mock notifications');
        
        // Mock notifications data
        const mockNotifications = [
          {
            id: 1,
            type: 'task_application',
            title: 'New Task Application',
            message: 'John Doe applied for your Web Development task',
            data: {
              taskId: 1,
              applicantId: 2,
              applicantName: 'John Doe',
              taskTitle: 'React Website Development'
            },
            read: false,
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            icon: '📝',
            priority: 'high'
          },
          {
            id: 2,
            type: 'payment_received',
            title: 'Payment Received',
            message: 'You received 150 credits for completing "Logo Design"',
            data: {
              amount: 150,
              taskId: 2,
              taskTitle: 'Logo Design'
            },
            read: false,
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            icon: '💰',
            priority: 'medium'
          },
          {
            id: 3,
            type: 'task_completed',
            title: 'Task Completed',
            message: 'Sarah Smith marked your task as completed',
            data: {
              taskId: 3,
              clientId: 3,
              clientName: 'Sarah Smith',
              taskTitle: 'Content Writing'
            },
            read: true,
            createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            icon: '✅',
            priority: 'medium'
          },
          {
            id: 4,
            type: 'new_message',
            title: 'New Message',
            message: 'Mike Johnson sent you a message',
            data: {
              senderId: 4,
              senderName: 'Mike Johnson',
              conversationId: 3,
              preview: 'Thanks for completing the task...'
            },
            read: true,
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            icon: '💬',
            priority: 'low'
          },
          {
            id: 5,
            type: 'review_received',
            title: 'New Review',
            message: 'You received a 5-star review from Emma Wilson',
            data: {
              reviewerId: 5,
              reviewerName: 'Emma Wilson',
              rating: 5,
              taskId: 4,
              taskTitle: 'Mobile App UI Design'
            },
            read: true,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            icon: '⭐',
            priority: 'medium'
          },
          {
            id: 6,
            type: 'task_reminder',
            title: 'Task Deadline Reminder',
            message: 'Your task "Website Redesign" is due in 2 hours',
            data: {
              taskId: 5,
              taskTitle: 'Website Redesign',
              deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            },
            read: false,
            createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            icon: '⏰',
            priority: 'high'
          }
        ];

        setNotifications(mockNotifications);
        
        // Calculate unread count
        const unread = mockNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        
        debugLog('Notifications loaded successfully', { 
          total: mockNotifications.length, 
          unread 
        });
        
      } catch (error) {
        debugLog('Failed to load notifications', { error: error.message });
        console.error('Failed to load notifications:', error);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => {
      debugLog('Cleaning up notification loading timer');
      clearTimeout(timer);
    };
  }, [user?.id]); // Only depend on user ID

  // Setup socket listeners - separate effect
  useEffect(() => {
    if (!socket || !user) {
      debugLog('Socket or user not available for listeners');
      return;
    }

    debugLog('Setting up socket listeners');

    const handleNewNotification = (notification) => {
      debugLog('Received new notification via socket', { 
        id: notification.id, 
        type: notification.type 
      });
      
      const newNotification = {
        id: notification.id || Date.now(),
        ...notification,
        read: false,
        createdAt: notification.createdAt || new Date().toISOString()
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id
          });
          debugLog('Browser notification shown');
        } catch (error) {
          debugLog('Failed to show browser notification', { error: error.message });
        }
      }
    };

    const handleNotificationRead = (notificationId) => {
      debugLog('Notification marked as read via socket', { notificationId });
      
      setNotifications(prev => 
        prev.map(notification => {
          if (notification.id === notificationId && !notification.read) {
            setUnreadCount(prevCount => Math.max(0, prevCount - 1));
            return { ...notification, read: true };
          }
          return notification;
        })
      );
    };

    // Add socket event listeners
    socket.on('notification', handleNewNotification);
    socket.on('notification_read', handleNotificationRead);

    debugLog('Socket listeners added');

    // Cleanup function
    return () => {
      debugLog('Removing socket listeners');
      socket.off('notification', handleNewNotification);
      socket.off('notification_read', handleNotificationRead);
    };
  }, [socket, user?.id]); // Only depend on socket and user ID

  // Mark notification as read
  const markAsRead = (notificationId) => {
    debugLog('Marking notification as read', { notificationId });
    
    setNotifications(prev => 
      prev.map(notification => {
        if (notification.id === notificationId && !notification.read) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
          return { ...notification, read: true };
        }
        return notification;
      })
    );

    // Emit to socket if available
    if (socket) {
      socket.emit('mark_notification_read', notificationId);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = () => {
    debugLog('Marking all notifications as read');
    
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);

    // Emit to socket if available
    if (socket) {
      socket.emit('mark_all_notifications_read');
    }
  };

  // Delete notification
  const deleteNotification = (notificationId) => {
    debugLog('Deleting notification', { notificationId });
    
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });

    // Emit to socket if available
    if (socket) {
      socket.emit('delete_notification', notificationId);
    }
  };

  // Clear all notifications
  const clearAll = () => {
    debugLog('Clearing all notifications');
    
    setNotifications([]);
    setUnreadCount(0);

    // Emit to socket if available
    if (socket) {
      socket.emit('clear_all_notifications');
    }
  };

  // Add new notification (internal use)
  const addNotification = (notification) => {
    debugLog('Adding new notification', { type: notification.type });
    
    const newNotification = {
      id: Date.now(),
      ...notification,
      read: false,
      createdAt: new Date().toISOString()
    };

    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: newNotification.id
        });
        debugLog('Browser notification shown for new notification');
      } catch (error) {
        debugLog('Failed to show browser notification', { error: error.message });
      }
    }

    return newNotification;
  };

  // Create different types of notifications
  const createTaskApplicationNotification = (applicant, task) => {
    debugLog('Creating task application notification', { 
      applicantId: applicant.id, 
      taskId: task.id 
    });
    
    return addNotification({
      type: 'task_application',
      title: 'New Task Application',
      message: `${applicant.name} applied for your ${task.title} task`,
      data: {
        taskId: task.id,
        applicantId: applicant.id,
        applicantName: applicant.name,
        taskTitle: task.title
      },
      icon: '📝',
      priority: 'high'
    });
  };

  const createPaymentNotification = (amount, task) => {
    debugLog('Creating payment notification', { amount, taskId: task.id });
    
    return addNotification({
      type: 'payment_received',
      title: 'Payment Received',
      message: `You received ${amount} credits for completing "${task.title}"`,
      data: {
        amount,
        taskId: task.id,
        taskTitle: task.title
      },
      icon: '💰',
      priority: 'medium'
    });
  };

  const createMessageNotification = (sender, preview) => {
    debugLog('Creating message notification', { senderId: sender.id });
    
    return addNotification({
      type: 'new_message',
      title: 'New Message',
      message: `${sender.name} sent you a message`,
      data: {
        senderId: sender.id,
        senderName: sender.name,
        preview: preview
      },
      icon: '💬',
      priority: 'low'
    });
  };

  const createReviewNotification = (reviewer, rating, task) => {
    debugLog('Creating review notification', { 
      reviewerId: reviewer.id, 
      rating, 
      taskId: task.id 
    });
    
    return addNotification({
      type: 'review_received',
      title: 'New Review',
      message: `You received a ${rating}-star review from ${reviewer.name}`,
      data: {
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
        rating,
        taskId: task.id,
        taskTitle: task.title
      },
      icon: '⭐',
      priority: 'medium'
    });
  };

  const createDeadlineReminder = (task, hoursRemaining) => {
    debugLog('Creating deadline reminder', { taskId: task.id, hoursRemaining });
    
    return addNotification({
      type: 'task_reminder',
      title: 'Task Deadline Reminder',
      message: `Your task "${task.title}" is due in ${hoursRemaining} hours`,
      data: {
        taskId: task.id,
        taskTitle: task.title,
        deadline: task.deadline
      },
      icon: '⏰',
      priority: 'high'
    });
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    debugLog('Requesting notification permission');
    
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        debugLog('Notification permission result', { permission });
        return permission === 'granted';
      } catch (error) {
        debugLog('Failed to request notification permission', { error: error.message });
        return false;
      }
    }
    debugLog('Notifications not supported in this browser');
    return false;
  };

  // Filter notifications by type
  const getNotificationsByType = (type) => {
    return notifications.filter(n => n.type === type);
  };

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return notifications.filter(n => new Date(n.createdAt) > oneDayAgo);
  };

  // Get high priority notifications
  const getHighPriorityNotifications = () => {
    return notifications.filter(n => n.priority === 'high' && !n.read);
  };

  // Export logs for debugging
  const exportLogs = () => {
    try {
      const logs = JSON.parse(localStorage.getItem('timeslice_logs') || '[]');
      const logData = {
        exportDate: new Date().toISOString(),
        component: 'NotificationContext',
        logs: logs.filter(log => log.component === 'NotificationContext')
      };
      
      const dataStr = JSON.stringify(logData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `notification_logs_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      debugLog('Logs exported successfully');
      return logData;
    } catch (error) {
      debugLog('Failed to export logs', { error: error.message });
      console.error('Failed to export logs:', error);
      return null;
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    createTaskApplicationNotification,
    createPaymentNotification,
    createMessageNotification,
    createReviewNotification,
    createDeadlineReminder,
    requestNotificationPermission,
    getNotificationsByType,
    getRecentNotifications,
    getHighPriorityNotifications,
    exportLogs
  };

  debugLog('NotificationProvider value created', { 
    notificationCount: notifications.length,
    unreadCount,
    loading,
    hasError: !!error
  });

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export { NotificationContext, NotificationProvider, useNotification };