import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../utils/api';
import socketService from '../utils/socket';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => {
  return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/chat/unread-count');
      setUnreadCount(response.data.unreadCount);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const fetchChats = useCallback(async () => {
    try {
      const response = await api.get('/chat');
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchChats();
      fetchUnreadCount();
      setupSocketListeners();
    }

    return () => {
      socketService.offReceiveMessage();
    };
  }, [currentUser, fetchChats, fetchUnreadCount]);

  const fetchMessages = async (chatId) => {
    try {
      const response = await api.get(`/chat/${chatId}/messages`);
      setMessages(prev => ({
        ...prev,
        [chatId]: response.data
      }));
      
      // Refresh unread count after fetching messages
      await fetchUnreadCount();
      
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  const sendMessage = async (chatId, content) => {
    try {
      const response = await api.post(`/chat/${chatId}/messages`, { content });
      
      // Add message to local state
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), response.data]
      }));

      // Send via socket for real-time delivery
      socketService.sendMessage({
        chatId,
        message: response.data
      });

      // Update chat last activity
      setChats(prev => prev.map(chat => 
        chat._id === chatId 
          ? { ...chat, lastMessage: response.data, lastActivity: new Date() }
          : chat
      ));

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const markChatAsRead = async (chatId) => {
    try {
      await api.put(`/chat/${chatId}/mark-read`);
      // Refresh unread count
      await fetchUnreadCount();
    } catch (error) {
      console.error('Error marking chat as read:', error);
    }
  };

  const setupSocketListeners = () => {
    socketService.onReceiveMessage((data) => {
      const { chatId, message } = data;
      
      // Add message to local state
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), message]
      }));

      // Update unread count only if not in active chat
      if (activeChat?._id !== chatId) {
        setUnreadCount(prev => prev + 1);
      }

      // Update chat last activity
      setChats(prev => prev.map(chat => 
        chat._id === chatId 
          ? { ...chat, lastMessage: message, lastActivity: new Date() }
          : chat
      ));
    });
  };

  const joinChat = async (chat) => {
    setActiveChat(chat);
    socketService.joinChat(chat._id);
    
    // Fetch messages if not already loaded
    if (!messages[chat._id]) {
      await fetchMessages(chat._id);
    } else {
      // Mark chat as read when joining
      await markChatAsRead(chat._id);
    }
  };

  const leaveChat = () => {
    if (activeChat) {
      // Mark current chat as read when leaving
      markChatAsRead(activeChat._id);
    }
    setActiveChat(null);
  };

  const value = {
    chats,
    activeChat,
    messages,
    unreadCount,
    fetchChats,
    fetchMessages,
    sendMessage,
    joinChat,
    leaveChat,
    fetchUnreadCount,
    markChatAsRead
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};