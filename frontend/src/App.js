// File: src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { DashboardProvider } from './context/DashboardContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BrowseTasks from './pages/BrowseTasks';
import CreateTask from './pages/CreateTask';
import MyTasks from './pages/MyTasks';
import MyBookings from './pages/MyBookings';
import TaskApplications from './pages/TaskApplications';
import ChatPage from './pages/ChatPage';
import Profile from './pages/Profile';
import './App.css';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user ? children : <Navigate to="/login" replace />;
};

// Public Route component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <DashboardProvider>
          <NotificationProvider>
            <Router>
              <div className="App">
                <Navbar />
                <main className="main-content">
                  <Routes>
                    {/* Public Routes */}
                    <Route 
                      path="/" 
                      element={
                        <PublicRoute>
                          <HomePage />
                        </PublicRoute>
                      } 
                    />
                    <Route 
                      path="/login" 
                      element={
                        <PublicRoute>
                          <Login />
                        </PublicRoute>
                      } 
                    />
                    <Route 
                      path="/register" 
                      element={
                        <PublicRoute>
                          <Register />
                        </PublicRoute>
                      } 
                    />

                    {/* Protected Routes */}
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/browse-tasks" 
                      element={
                        <ProtectedRoute>
                          <BrowseTasks />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/post-task" 
                      element={
                        <ProtectedRoute>
                          <CreateTask />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/my-tasks" 
                      element={
                        <ProtectedRoute>
                          <MyTasks />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/my-bookings" 
                      element={
                        <ProtectedRoute>
                          <MyBookings />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/applications" 
                      element={
                        <ProtectedRoute>
                          <TaskApplications />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/chat" 
                      element={
                        <ProtectedRoute>
                          <ChatPage />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/profile" 
                      element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } 
                    />

                    {/* Catch all route - redirect to dashboard if logged in, home if not */}
                    <Route 
                      path="*" 
                      element={
                        <Navigate 
                          to={JSON.parse(localStorage.getItem('user') || 'null') ? '/dashboard' : '/'} 
                          replace 
                        />
                      } 
                    />
                  </Routes>
                </main>
              </div>
            </Router>
          </NotificationProvider>
        </DashboardProvider>
      </ChatProvider>
    </AuthProvider>
  );
}

export default App;