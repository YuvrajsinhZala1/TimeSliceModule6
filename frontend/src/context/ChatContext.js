// File: src/context/ChatContext.js
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthContext } from './AuthContext';

const ChatContext = createContext();

// Custom hook to use chat context
const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { user, socket } = useContext(AuthContext);

  // Stable mock conversations generator
  const generateMockConversations = useCallback((currentUser) => {
    if (!currentUser) return [];

    return [
      {
        id: 1,
        participants: [
          { id: currentUser.id, name: currentUser.name, avatar: null },
          { id: 2, name: 'John Doe', avatar: null }
        ],
        lastMessage: {
          id: 1,
          content: 'Hey, I can help you with your React project!',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          senderId: 2,
          type: 'text'
        },
        unreadCount: 2,
        type: 'direct',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 2,
        participants: [
          { id: currentUser.id, name: currentUser.name, avatar: null },
          { id: 3, name: 'Sarah Smith', avatar: null }
        ],
        lastMessage: {
          id: 2,
          content: 'Perfect! I\'ll send you the designs shortly.',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          senderId: currentUser.id,
          type: 'text'
        },
        unreadCount: 0,
        type: 'direct',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 3,
        participants: [
          { id: currentUser.id, name: currentUser.name, avatar: null },
          { id: 4, name: 'Mike Johnson', avatar: null }
        ],
        lastMessage: {
          id: 3,
          content: 'Thanks for completing the task so quickly!',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          senderId: 4,
          type: 'text'
        },
        unreadCount: 1,
        type: 'direct',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  }, []);

  // Load conversations when user changes
  useEffect(() => {
    if (!user) {
      setConversations([]);
      setUnreadCount(0);
      return;
    }

    let mounted = true;
    setLoading(true);
    
    // Simulate loading conversations
    const timer = setTimeout(() => {
      if (!mounted) return;

      try {
        const mockConversations = generateMockConversations(user);
        setConversations(mockConversations);
        
        // Calculate total unread count
        const totalUnread = mockConversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
        setUnreadCount(totalUnread);
        
        setError(null);
      } catch (error) {
        console.error('Failed to load conversations:', error);
        if (mounted) {
          setError('Failed to load conversations');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }, 600);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [user?.id, generateMockConversations]);

  // Setup socket listeners - separate effect to prevent loops
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewMessage = (message) => {
      setMessages(prev => [...prev, message]);
      
      // Update conversation last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === message.conversationId 
            ? { 
                ...conv, 
                lastMessage: message,
                unreadCount: conv.id === activeConversation?.id ? 0 : conv.unreadCount + 1
              }
            : conv
        )
      );
      
      // Update unread count if not in active conversation
      if (!activeConversation || activeConversation.id !== message.conversationId) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleConversationUpdate = (conversation) => {
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversation.id ? conversation : conv
        )
      );
    };

    const handleTyping = (data) => {
      console.log('User typing:', data);
    };

    socket.on('message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdate);
    socket.on('typing', handleTyping);

    return () => {
      socket.off('message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdate);
      socket.off('typing', handleTyping);
    };
  }, [socket, user?.id, activeConversation?.id]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId) => {
    try {
      setLoading(true);
      
      // Mock messages data
      const mockMessages = [
        {
          id: 1,
          conversationId,
          content: 'Hi! I saw your task posting for React development.',
          senderId: 2,
          senderName: 'John Doe',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'delivered'
        },
        {
          id: 2,
          conversationId,
          content: 'Great! Can you tell me more about your experience with React?',
          senderId: user?.id,
          senderName: user?.name,
          timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'read'
        },
        {
          id: 3,
          conversationId,
          content: 'I have 3+ years of experience with React, Redux, and modern JS. I\'ve built several commercial applications.',
          senderId: 2,
          senderName: 'John Doe',
          timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'delivered'
        },
        {
          id: 4,
          conversationId,
          content: 'Hey, I can help you with your React project!',
          senderId: 2,
          senderName: 'John Doe',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          type: 'text',
          status: 'delivered'
        }
      ];

      setMessages(mockMessages);
      
      // Mark conversation as read
      markConversationAsRead(conversationId);
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send a message - FIXED SCOPING ISSUE
  const sendMessage = useCallback(async (conversationId, content, type = 'text') => {
    if (!user) return;

    // Declare newMessage outside try-catch block to fix scoping issue
    let newMessage = null;

    try {
      newMessage = {
        id: Date.now(),
        conversationId,
        content,
        senderId: user.id,
        senderName: user.name,
        timestamp: new Date().toISOString(),
        type,
        status: 'sending'
      };

      // Optimistically add message
      setMessages(prev => [...prev, newMessage]);

      // Emit to socket
      if (socket) {
        socket.emit('send_message', newMessage);
      }

      // Update message status to sent
      setTimeout(() => {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'sent' }
              : msg
          )
        );
      }, 500);

      // Update conversation last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, lastMessage: newMessage }
            : conv
        )
      );

      return newMessage;
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Update message status to failed - newMessage is now accessible
      if (newMessage) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
      }
      
      throw new Error('Failed to send message');
    }
  }, [user, socket]);

  // Create new conversation
  const createConversation = useCallback(async (participantIds, initialMessage = null) => {
    if (!user) return;

    try {
      const newConversation = {
        id: Date.now(),
        participants: [
          { id: user.id, name: user.name, avatar: null },
          ...participantIds.map(id => ({ id, name: `User ${id}`, avatar: null }))
        ],
        lastMessage: initialMessage,
        unreadCount: 0,
        type: 'direct',
        createdAt: new Date().toISOString()
      };

      setConversations(prev => [newConversation, ...prev]);
      setActiveConversation(newConversation);

      if (initialMessage) {
        await sendMessage(newConversation.id, initialMessage);
      }

      return newConversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }, [user, sendMessage]);

  // Mark conversation as read
  const markConversationAsRead = useCallback((conversationId) => {
    setConversations(prev => 
      prev.map(conv => {
        if (conv.id === conversationId && conv.unreadCount > 0) {
          // Update total unread count
          setUnreadCount(prevCount => prevCount - conv.unreadCount);
          return { ...conv, unreadCount: 0 };
        }
        return conv;
      })
    );
  }, []);

  // Start a chat with a user
  const startChat = useCallback(async (userId, userName, initialMessage = null) => {
    try {
      // Check if conversation already exists
      const existingConv = conversations.find(conv => 
        conv.participants.some(p => p.id === userId)
      );

      if (existingConv) {
        setActiveConversation(existingConv);
        await loadMessages(existingConv.id);
        return existingConv;
      }

      // Create new conversation
      const newConversation = await createConversation([userId], initialMessage);
      return newConversation;
    } catch (error) {
      console.error('Failed to start chat:', error);
      throw new Error('Failed to start chat');
    }
  }, [conversations, loadMessages, createConversation]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((conversationId) => {
    if (socket && user) {
      socket.emit('typing', {
        conversationId,
        userId: user.id,
        userName: user.name
      });
    }
  }, [socket, user]);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId) => {
    try {
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      if (activeConversation?.id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }, [activeConversation]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    conversations,
    activeConversation,
    messages,
    unreadCount,
    loading,
    error,
    setActiveConversation,
    loadMessages,
    sendMessage,
    createConversation,
    startChat,
    sendTypingIndicator,
    deleteConversation,
    markConversationAsRead
  }), [
    conversations,
    activeConversation,
    messages,
    unreadCount,
    loading,
    error,
    loadMessages,
    sendMessage,
    createConversation,
    startChat,
    sendTypingIndicator,
    deleteConversation,
    markConversationAsRead
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export { ChatContext, ChatProvider, useChat };