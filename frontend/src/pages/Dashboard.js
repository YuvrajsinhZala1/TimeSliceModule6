// File: src/pages/Dashboard.js
import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { DashboardContext } from '../context/DashboardContext';
import { useLogger } from '../hooks/useLogger';

// Dashboard Components - Using stable versions
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

  const { user } = useContext(AuthContext);
  const { 
    dashboardData, 
    loading: contextLoading, 
    error: contextError
  } = useContext(DashboardContext);
  
  const logger = useLogger('Dashboard');

  // Stable data object to prevent re-renders
  const stableData = useMemo(() => {
    return dashboardData || {
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
          { date: '2024-06-03', tasks: 4, rating: 4.8 }
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
        }
      ]
    };
  }, [dashboardData]);

  // Stable initialization
  useEffect(() => {
    let mounted = true;
    
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        logger.info('Initializing dashboard', { user: user?.email });

        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (mounted) {
          setIsLoading(false);
        }
        
      } catch (error) {
        if (mounted) {
          logger.error('Dashboard initialization failed', { error: error.message });
          setError(error.message || 'Failed to load dashboard data');
          setIsLoading(false);
        }
      }
    };

    if (user) {
      initializeDashboard();
    }

    return () => {
      mounted = false;
    };
  }, [user?.id, logger]); // Only depend on user ID

  // Stable tab handler
  const handleTabChange = useCallback((tab) => {
    logger.info('Dashboard tab changed', { from: activeTab, to: tab });
    setActiveTab(tab);
  }, [activeTab, logger]);

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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !stableData) {
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
                  <DashboardStats 
                    data={stableData.stats} 
                    userRole={user?.primaryRole || 'helper'}
                    timeRange="7d"
                  />
                </div>
                
                <div className="charts-section">
                  <div className="chart-row">
                    <div className="chart-item">
                      <EarningsChart 
                        data={stableData.earnings} 
                        timeRange="7d"
                      />
                    </div>
                    <div className="chart-item">
                      <PerformanceChart 
                        data={stableData.performance} 
                        timeRange="7d"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="actions-section">
                  <QuickActions 
                    userRole={user?.primaryRole || 'helper'}
                    unreadCount={0}
                    recentActivity={stableData.activities || []}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="tab-panel fade-in">
              <div className="analytics-grid">
                <div className="analytics-item">
                  <TaskAnalytics 
                    data={stableData} 
                    timeRange="7d"
                    userRole={user?.primaryRole || 'helper'}
                  />
                </div>
                <div className="analytics-item">
                  <SuccessMetrics 
                    data={stableData} 
                    timeRange="7d"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="tab-panel fade-in">
              <ActivityFeed 
                activities={stableData.activities || []} 
                limit={10}
                showViewAll={true}
                showFilters={true}
              />
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="tab-panel fade-in">
              <PlatformInsights 
                data={stableData} 
                analyticsData={stableData}
                timeRange="7d"
                userRole={user?.primaryRole || 'helper'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;