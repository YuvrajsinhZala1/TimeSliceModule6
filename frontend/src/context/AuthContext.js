// File: src/context/AuthContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
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

  // Initialize authentication - runs only once
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Set token in API headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get user data (mock for development)
          const userData = JSON.parse(localStorage.getItem('user') || '{}');
          if (userData.email) {
            setUser(userData);
            
            // Initialize socket
            try {
              const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
                auth: {
                  token: token,
                  userId: userData.id
                }
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

              setSocket(newSocket);
            } catch (error) {
              console.error('Socket initialization error:', error);
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Cleanup function
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []); // Empty dependency array - runs only once

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);

      // Mock login for development
      const mockUser = {
        id: Date.now(),
        email,
        name: email.split('@')[0],
        userType: 'helper',
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

      // Initialize socket for new user
      try {
        const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
          auth: {
            token: token,
            userId: mockUser.id
          }
        });

        newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('Socket initialization error:', error);
      }

      return mockUser;
    } catch (error) {
      console.error('Login error:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);

      // Mock registration
      const mockUser = {
        id: Date.now(),
        email: userData.email,
        name: userData.name,
        userType: userData.userType,
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

      // Initialize socket for new user
      try {
        const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
          auth: {
            token: token,
            userId: mockUser.id
          }
        });

        newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('Socket initialization error:', error);
      }

      return mockUser;
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);

      // Disconnect socket
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

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
  };

  // Update user profile
  const updateProfile = async (updateData) => {
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
  };

  // Switch user type
  const switchUserType = async (newType) => {
    try {
      const updatedUser = { ...user, userType: newType };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      console.error('User type switch error:', error);
      throw new Error('Failed to switch user type');
    }
  };

  const value = {
    user,
    loading,
    socket,
    login,
    register,
    logout,
    updateProfile,
    switchUserType
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider, useAuth };