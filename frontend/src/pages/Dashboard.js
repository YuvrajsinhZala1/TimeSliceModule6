import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useDashboard } from '../hooks/useDashboard';
import { useLogger } from '../hooks/useLogger';
import api from '../utils/api';

// Enhanced Dashboard Components
import DashboardStats from '../components/dashboard/DashboardStats';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import EarningsChart from '../components/dashboard/EarningsChart';
import TaskAnalytics from '../components/dashboard/TaskAnalytics';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import SuccessMetrics from '../components/dashboard/SuccessMetrics';
import QuickActions from '../components/dashboard/QuickActions';
import PlatformInsights from '../components/dashboard/PlatformInsights';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { unreadCount } = useChat();
  const navigate = useNavigate();
  const logger = useLogger();
  
  // Dashboard state
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d'); // 1d, 7d, 30d, 90d
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  // Dashboard data using custom hook
  const {
    dashboardData,
    analyticsData,
    recentActivity,
    performanceMetrics,
    loading: dashboardLoading,
    error: dashboardError,
    refreshData
  } = useDashboard(timeRange);

  // Component mount logging
  useEffect(() => {
    logger.info('Dashboard component mounted', {
      userId: currentUser?.id,
      userRole: currentUser?.primaryRole,
      timestamp: new Date().toISOString()
    });

    if (!currentUser) {
      logger.warn('Unauthorized access attempt to dashboard');
      navigate('/login');
      return;
    }

    // Initial data fetch
    initializeDashboard();

    // Set up auto-refresh
    const interval = setInterval(() => {
      refreshData();
      logger.debug('Dashboard auto-refresh triggered');
    }, refreshInterval);

    return () => {
      clearInterval(interval);
      logger.info('Dashboard component unmounted');
    };
  }, [currentUser, navigate, refreshInterval, logger]);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      
      logger.info('Initializing dashboard data', { 
        timeRange, 
        userId: currentUser.id 
      });

      await refreshData();
      
      logger.info('Dashboard initialization completed successfully');
    } catch (error) {
      const errorMessage = 'Failed to initialize dashboard';
      setError(errorMessage);
      logger.error('Dashboard initialization failed', {
        error: error.message,
        stack: error.stack,
        userId: currentUser?.id
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = useCallback((newTimeRange) => {
    logger.info('Time range changed', { 
      from: timeRange, 
      to: newTimeRange,
      userId: currentUser?.id 
    });
    setTimeRange(newTimeRange);
  }, [timeRange, currentUser, logger]);

  const handleRefresh = useCallback(async () => {
    try {
      logger.info('Manual dashboard refresh triggered');
      await refreshData();
      logger.info('Manual refresh completed successfully');
    } catch (error) {
      logger.error('Manual refresh failed', { error: error.message });
      setError('Failed to refresh dashboard data');
    }
  }, [refreshData, logger]);

  const handleTabChange = useCallback((tab) => {
    logger.info('Dashboard tab changed', { 
      from: activeTab, 
      to: tab,
      userId: currentUser?.id 
    });
    setActiveTab(tab);
  }, [activeTab, currentUser, logger]);

  // Loading state
  if (loading || dashboardLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="dashboard-loading"
      >
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </motion.div>
    );
  }

  // Error state
  if (error || dashboardError) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="dashboard-error"
      >
        <div className="error-container">
          <h3>⚠️ Dashboard Error</h3>
          <p>{error || dashboardError}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            🔄 Try Again
          </button>
        </div>
      </motion.div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const isPrimaryHelper = currentUser.primaryRole === 'helper';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="enhanced-dashboard"
    >
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="welcome-section"
          >
            <h1>
              Welcome back, {currentUser.username}! 
              <span className="role-badge">
                {isPrimaryHelper ? ' 🤝 Helper' : ' 📋 Task Provider'}
              </span>
            </h1>
            <p className="dashboard-subtitle">
              Here's what's happening with your TimeSlice account
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="dashboard-controls"
          >
            {/* Time Range Selector */}
            <div className="time-range-selector">
              <label>Time Range:</label>
              <select 
                value={timeRange} 
                onChange={(e) => handleTimeRangeChange(e.target.value)}
                className="time-select"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh} 
              className="refresh-btn"
              title="Refresh Dashboard"
            >
              🔄
            </button>

            {/* Settings */}
            <div className="refresh-settings">
              <label>Auto-refresh:</label>
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="refresh-select"
              >
                <option value={10000}>10 seconds</option>
                <option value={30000}>30 seconds</option>
                <option value={60000}>1 minute</option>
                <option value={300000}>5 minutes</option>
                <option value={0}>Off</option>
              </select>
            </div>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="dashboard-tabs"
        >
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'analytics', label: '📈 Analytics', icon: '📈' },
            { id: 'activity', label: '🔔 Activity', icon: '🔔' },
            { id: 'insights', label: '💡 Insights', icon: '💡' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </motion.div>
      </div>

      {/* Dashboard Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="dashboard-content"
        >
          {activeTab === 'overview' && (
            <div className="overview-tab">
              {/* Key Stats */}
              <DashboardStats 
                data={dashboardData} 
                timeRange={timeRange}
                userRole={currentUser.primaryRole}
              />

              {/* Quick Actions */}
              <QuickActions 
                userRole={currentUser.primaryRole}
                unreadCount={unreadCount}
                recentActivity={recentActivity}
              />

              {/* Performance Overview */}
              <div className="charts-grid">
                <PerformanceChart 
                  data={performanceMetrics} 
                  timeRange={timeRange}
                />
                <EarningsChart 
                  data={analyticsData?.earnings} 
                  timeRange={timeRange}
                />
              </div>

              {/* Recent Activity */}
              <ActivityFeed 
                activities={recentActivity} 
                limit={5}
                showViewAll={true}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-tab">
              <TaskAnalytics 
                data={analyticsData} 
                timeRange={timeRange}
                userRole={currentUser.primaryRole}
              />
              
              <SuccessMetrics 
                data={dashboardData} 
                timeRange={timeRange}
              />

              <div className="detailed-charts">
                <PerformanceChart 
                  data={performanceMetrics} 
                  timeRange={timeRange}
                  detailed={true}
                />
                <EarningsChart 
                  data={analyticsData?.earnings} 
                  timeRange={timeRange}
                  detailed={true}
                />
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="activity-tab">
              <ActivityFeed 
                activities={recentActivity} 
                limit={50}
                showFilters={true}
                realTime={true}
              />
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="insights-tab">
              <PlatformInsights 
                data={dashboardData} 
                analyticsData={analyticsData}
                timeRange={timeRange}
                userRole={currentUser.primaryRole}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="debug-panel"
        >
          <details>
            <summary>🔧 Debug Information</summary>
            <div className="debug-content">
              <h4>Dashboard State:</h4>
              <pre>{JSON.stringify({
                activeTab,
                timeRange,
                refreshInterval,
                dataLoaded: !!dashboardData,
                userRole: currentUser.primaryRole,
                timestamp: new Date().toISOString()
              }, null, 2)}</pre>
              
              <h4>Performance Metrics:</h4>
              <pre>{JSON.stringify(performanceMetrics, null, 2)}</pre>
            </div>
          </details>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;