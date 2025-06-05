import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../utils/api';
import socketService from '../utils/socket';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [currentPopupNotification, setCurrentPopupNotification] = useState(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      fetchUnreadCount();
      setupSocketListeners();
    }
  }, [currentUser, fetchNotifications, fetchUnreadCount]);

  const setupSocketListeners = () => {
    if (currentUser) {
      // Join user's notification room
      socketService.socket?.emit('join_user_room', currentUser.id);

      // Listen for real-time notifications
      socketService.socket?.on('receive_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show popup for action-required notifications
        if (notification.actionRequired) {
          setCurrentPopupNotification(notification);
          setShowPopup(true);
        }
      });
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true }
            : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/mark-all-read');
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setCurrentPopupNotification(null);
  };

  const handlePopupAction = async (action) => {
    if (currentPopupNotification) {
      await markAsRead(currentPopupNotification._id);
      
      if (action === 'view') {
        // Navigate to relevant page based on notification type
        if (currentPopupNotification.type === 'work_submitted') {
          window.location.href = '/my-tasks';
        } else if (currentPopupNotification.type === 'application_received') {
          window.location.href = '/task-applications';
        }
      }
    }
    closePopup();
  };

  const value = {
    notifications,
    unreadCount,
    showPopup,
    currentPopupNotification,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    closePopup,
    handlePopupAction
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};