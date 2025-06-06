// File: src/context/AuthContext.js - FIXED ORIGINAL VERSION
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import api from '../utils/api';
import { io } from 'socket.io-client';

const AuthContext = createContext();

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  
  // Use refs to prevent re-creation and track initialization
  const initializationRef = useRef(false);
  const socketRef = useRef(null);

  // Stable socket initialization function
  const initializeSocket = useCallback((token, userId) => {
    // Don't create socket if one already exists
    if (socketRef.current) {
      return socketRef.current;
    }

    try {
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: token,
          userId: userId
        },
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Store in ref and state
      socketRef.current = newSocket;
      setSocket(newSocket);
      
      return newSocket;
    } catch (error) {
      console.error('Socket initialization error:', error);
      return null;
    }
  }, []);

  // Stable socket cleanup function
  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }
  }, []);

  // Initialize authentication - runs only once
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) return;
    initializationRef.current = true;

    let mounted = true;

    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token && mounted) {
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get user data (mock for development)
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          if (userData.email && mounted) {
            setUser(userData);
            
            // Initialize socket
            initializeSocket(token, userData.id);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Cleanup function
    return () => {
      mounted = false;
      cleanupSocket();
    };
  }, [initializeSocket, cleanupSocket]); // Stable dependencies

  // Stable login function
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);

      // Mock login for development
      const mockUser = {
        id: Date.now(),
        email,
        name: email.split('@')[0],
        userType: 'helper',
        primaryRole: 'helper', // Add alias
        credits: 40,
        avatar: null,
        skills: ['Web Development', 'React'],
        rating: 4.8,
        completedTasks: 23,
        joinedDate: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock token
      const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2)}`;

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Set API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Update state
      setUser(mockUser);

      // Initialize socket for new user (cleanup previous first)
      cleanupSocket();
      initializeSocket(token, mockUser.id);

      return mockUser;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, [initializeSocket, cleanupSocket]);

  // Stable register function
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);

      // Mock registration
      const mockUser = {
        id: Date.now(),
        email: userData.email,
        name: userData.name,
        userType: userData.userType,
        primaryRole: userData.userType, // Add alias
        skills: userData.skills || [],
        hourlyRate: userData.hourlyRate || null,
        bio: userData.bio || '',
        credits: 50, // Starting credits
        avatar: null,
        rating: 0,
        completedTasks: 0,
        joinedDate: new Date().toISOString()
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate mock token
      const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2)}`;

      // Store in localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(mockUser));

      // Set API headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Update state
      setUser(mockUser);

      // Initialize socket for new user (cleanup previous first)
      cleanupSocket();
      initializeSocket(token, mockUser.id);

      return mockUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }, [initializeSocket, cleanupSocket]);

  // Stable logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Disconnect socket
      cleanupSocket();

      // Clear storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Clear API headers
      delete api.defaults.headers.common['Authorization'];

      // Clear state
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  }, [cleanupSocket]);

  // Stable update profile function
  const updateProfile = useCallback(async (updateData) => {
    try {
      const updatedUser = { ...user, ...updateData };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw new Error('Failed to update profile');
    }
  }, [user]);

  // Stable switch user type function
  const switchUserType = useCallback(async (newType) => {
    try {
      const updatedUser = { 
        ...user, 
        userType: newType,
        primaryRole: newType // Keep both for compatibility
      };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('User type switch error:', error);
      throw new Error('Failed to switch user type');
    }
  }, [user]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    user,
    currentUser: user, // Add alias for compatibility
    loading,
    socket: socketRef.current, // Use ref for stable socket reference
    login,
    register,
    logout,
    updateProfile,
    switchUserType,
    // Additional helper properties
    isAuthenticated: !!user,
    userRole: user?.userType || user?.primaryRole
  }), [
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    switchUserType
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider, useAuth };