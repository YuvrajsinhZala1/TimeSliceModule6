import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import { DashboardProvider } from './context/DashboardContext'; // ADD THIS
import Navbar from './components/Navbar';
import NotificationPopup from './components/NotificationPopup';
import HomePage from './pages/HomePage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import CreateTask from './pages/CreateTask';
import BrowseTasks from './pages/BrowseTasks';
import MyTasks from './pages/MyTasks';
import TaskApplications from './pages/TaskApplications';
import ChatPage from './pages/ChatPage';
import MyBookings from './pages/MyBookings';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
          <DashboardProvider> {/* ADD THIS WRAPPER */}
            <Router>
              <div className="App">
                <Navbar />
                <NotificationPopup />
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={
                    <div className="container">
                      <Login />
                    </div>
                  } />
                  <Route path="/register" element={
                    <div className="container">
                      <Register />
                    </div>
                  } />
                  <Route path="/dashboard" element={
                    <div className="container">
                      <Dashboard />
                    </div>
                  } />
                  <Route path="/profile" element={
                    <div className="container">
                      <Profile />
                    </div>
                  } />
                  <Route path="/create-task" element={
                    <div className="container">
                      <CreateTask />
                    </div>
                  } />
                  <Route path="/browse-tasks" element={
                    <div className="container">
                      <BrowseTasks />
                    </div>
                  } />
                  <Route path="/my-tasks" element={
                    <div className="container">
                      <MyTasks />
                    </div>
                  } />
                  <Route path="/task-applications" element={
                    <div className="container">
                      <TaskApplications />
                    </div>
                  } />
                  <Route path="/chat" element={
                    <div className="container">
                      <ChatPage />
                    </div>
                  } />
                  <Route path="/my-bookings" element={
                    <div className="container">
                      <MyBookings />
                    </div>
                  } />
                </Routes>
              </div>
            </Router>
          </DashboardProvider> {/* CLOSE THE WRAPPER */}
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;