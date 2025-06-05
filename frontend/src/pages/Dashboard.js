// File: src/pages/Dashboard.js
import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { DashboardContext } from '../context/DashboardContext';
import { useLogger } from '../hooks/useLogger';

// Dashboard Components
import DashboardStats from '../components/dashboard/DashboardStats';
import EarningsChart from '../components/dashboard/EarningsChart';
import PerformanceChart from '../components/dashboard/PerformanceChart';
import QuickActions from '../components/dashboard/QuickActions';
import TaskAnalytics from '../components/dashboard/TaskAnalytics';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import SuccessMetrics from '../components/dashboard/SuccessMetrics';
import PlatformInsights from '../components/dashboard/PlatformInsights';

import './Dashboard.css';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const { user } = useContext(AuthContext);
  const { 
    dashboardData, 
    loading: contextLoading, 
    error: contextError,
    refreshDashboard 
  } = useContext(DashboardContext);
  
  const logger = useLogger('Dashboard');

  // Mock data for development - Remove when backend is ready
  const mockDashboardData = {
    stats: {
      totalEarnings: 1250,
      completedTasks: 23,
      avgRating: 4.8,
      activeBookings: 3,
      creditsEarned: 1850,
      creditsSpent: 600
    },
    earnings: {
      thisMonth: 450,
      lastMonth: 380,
      chartData: [
        { month: 'Jan', earnings: 200 },
        { month: 'Feb', earnings: 300 },
        { month: 'Mar', earnings: 250 },
        { month: 'Apr', earnings: 400 },
        { month: 'May', earnings: 380 },
        { month: 'Jun', earnings: 450 }
      ]
    },
    performance: {
      responseTime: 2.5,
      completionRate: 95,
      customerSatisfaction: 4.8,
      chartData: [
        { date: '2024-06-01', tasks: 3, rating: 4.5 },
        { date: '2024-06-02', tasks: 2, rating: 5.0 },
        { date: '2024-06-03', tasks: 4, rating: 4.8 },
        { date: '2024-06-04', tasks: 1, rating: 4.9 },
        { date: '2024-06-05', tasks: 3, rating: 4.7 }
      ]
    },
    activities: [
      {
        id: 1,
        type: 'task_completed',
        title: 'Website Design Task Completed',
        description: 'Successfully delivered a responsive website design',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        amount: 150,
        user: 'John Doe'
      },
      {
        id: 2,
        type: 'payment_received',
        title: 'Payment Received',
        description: 'Received payment for React component development',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        amount: 200,
        user: 'Sarah Smith'
      },
      {
        id: 3,
        type: 'new_booking',
        title: 'New Booking Request',
        description: 'Received a new booking request for logo design',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        user: 'Mike Johnson'
      },
      {
        id: 4,
        type: 'review_received',
        title: 'New Review Received',
        description: 'Received a 5-star review for exceptional work',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        rating: 5,
        user: 'Emma Wilson'
      }
    ],
    insights: {
      marketTrends: [
        'Web development services are in high demand (+25% this month)',
        'Design tasks show consistent growth in your skill area',
        'Premium pricing is well-received by your client base'
      ],
      recommendations: [
        'Consider expanding your service offerings to include mobile development',
        'Your response time is excellent - highlight this in your profile',
        'Schedule availability during peak hours (2-6 PM) for better visibility'
      ],
      platformStats: {
        totalUsers: 15420,
        tasksPosted: 2840,
        averageTaskValue: 125
      }
    }
  };

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        logger.info('Initializing dashboard', { 
          user: user?.email, 
          activeTab,
          retryCount 
        });

        // Simulate API call delay for realistic loading
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try to use context data first, fallback to mock data
        if (contextError && retryCount < 3) {
          logger.warn('Dashboard context error, retrying...', { 
            error: contextError, 
            retryCount 
          });
          
          setRetryCount(prev => prev + 1);
          await refreshDashboard();
          return;
        }

        // Use mock data for development
        logger.info('Using mock dashboard data for development');
        
        setIsLoading(false);
        
      } catch (error) {
        logger.error('Dashboard initialization failed', { 
          error: error.message,
          stack: error.stack 
        });
        
        setError(error.message || 'Failed to load dashboard data');
        setIsLoading(false);
      }
    };

    if (user) {
      initializeDashboard();
    }
  }, [user, contextError, retryCount, refreshDashboard, logger, activeTab]);

  // Handle tab changes
  const handleTabChange = (tab) => {
    logger.info('Dashboard tab changed', { from: activeTab, to: tab });
    setActiveTab(tab);
  };

  // Handle retry
  const handleRetry = () => {
    logger.info('Retrying dashboard load');
    setRetryCount(0);
    setError(null);
    refreshDashboard();
  };

  // Use context data if available, otherwise use mock data
  const currentData = dashboardData || mockDashboardData;

  // Loading State
  if (isLoading || contextLoading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="loading-container">
            <div className="loading-content">
              <div className="loading-spinner-large"></div>
              <h3 className="loading-title">Loading your dashboard...</h3>
              <p className="loading-subtitle">
                Gathering your latest stats and activities
              </p>
              <div className="loading-progress">
                <div className="loading-bar">
                  <div className="loading-fill"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !currentData) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-container">
          <div className="error-container">
            <div className="error-content">
              <div className="error-icon">⚠️</div>
              <h3 className="error-title">Unable to load dashboard</h3>
              <p className="error-message">{error}</p>
              <div className="error-actions">
                <button 
                  className="btn btn-primary"
                  onClick={handleRetry}
                >
                  Try Again
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'activity', label: 'Activity', icon: '⚡' },
    { id: 'insights', label: 'Insights', icon: '💡' }
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {/* Dashboard Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Welcome back, {user?.name || 'User'}!</h1>
              <p>Here's what's happening with your TimeSlice activity</p>
            </div>
            <div className="header-actions">
              <button 
                className="btn btn-outline"
                onClick={handleRetry}
                disabled={isLoading}
              >
                <span className="btn-icon">🔄</span>
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="dashboard-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="tab-panel fade-in">
              <div className="dashboard-grid">
                <div className="stats-section">
                  <DashboardStats data={currentData.stats} />
                </div>
                
                <div className="charts-section">
                  <div className="chart-row">
                    <div className="chart-item">
                      <EarningsChart data={currentData.earnings} />
                    </div>
                    <div className="chart-item">
                      <PerformanceChart data={currentData.performance} />
                    </div>
                  </div>
                </div>
                
                <div className="actions-section">
                  <QuickActions />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="tab-panel fade-in">
              <div className="analytics-grid">
                <div className="analytics-item">
                  <TaskAnalytics data={currentData} />
                </div>
                <div className="analytics-item">
                  <SuccessMetrics data={currentData} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="tab-panel fade-in">
              <ActivityFeed activities={currentData.activities} />
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="tab-panel fade-in">
              <PlatformInsights data={currentData.insights} />
            </div>
          )}
        </div>

        {/* Error notification if data is stale */}
        {error && currentData && (
          <div className="dashboard-notice">
            <div className="notice-content">
              <span className="notice-icon">⚠️</span>
              <span className="notice-text">
                Using cached data. Some information may be outdated.
              </span>
              <button 
                className="notice-action"
                onClick={handleRetry}
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;