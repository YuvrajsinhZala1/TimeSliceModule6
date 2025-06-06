// File: src/context/DashboardContext.js
import React, { createContext, useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react';
import { AuthContext } from './AuthContext';

const DashboardContext = createContext();

// Custom hook to use dashboard context
const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};

const DashboardProvider = ({ children }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  const { user, socket } = useContext(AuthContext);
  const initializationRef = useRef(false);
  const userIdRef = useRef(null);

  // Memoized mock data generator to prevent recreation
  const generateMockDashboardData = useCallback((userData) => {
    if (!userData) return null;
    
    const isHelper = userData.userType === 'helper' || userData.primaryRole === 'helper';
    const now = new Date();

    // Generate stable mock data
    const baseData = {
      stats: {
        totalEarnings: isHelper ? 1250 : 800,
        completedTasks: isHelper ? 23 : 15,
        avgRating: 4.8,
        activeBookings: 3,
        creditsEarned: isHelper ? 1850 : 1200,
        creditsSpent: isHelper ? 600 : 400,
        completionRate: 95,
        responseTime: 2.1,
        customerSatisfaction: 92,
        earningsGrowth: 15,
        applicationSuccessRate: isHelper ? 75 : undefined,
        tasksCreated: !isHelper ? 12 : undefined,
        applicationsReceived: !isHelper ? 45 : undefined
      },
      earnings: {
        thisMonth: 450,
        lastMonth: 380,
        growth: 18,
        chartData: Array.from({ length: 6 }, (_, i) => ({
          month: new Date(now.getFullYear(), now.getMonth() - (5 - i), 1).toISOString().slice(0, 7),
          earnings: Math.round((400 + Math.random() * 200) * (isHelper ? 1.2 : 0.8))
        }))
      },
      performance: {
        data: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now);
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toISOString().slice(0, 10),
            tasks: Math.floor(Math.random() * 4) + 1,
            rating: Math.round((Math.random() * 1 + 4) * 10) / 10,
            responseTime: Math.round((Math.random() * 3 + 1) * 10) / 10,
            completionRate: Math.round((Math.random() * 15 + 85) * 10) / 10
          };
        }),
        avgResponseTime: 2.1,
        completionRate: 95,
        customerSatisfaction: 92
      },
      activities: [
        {
          id: 1,
          type: 'task_completed',
          title: 'Website Development Task Completed',
          description: 'Successfully delivered a responsive React website',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          amount: 250,
          user: 'John Smith',
          icon: '✅'
        },
        {
          id: 2,
          type: 'payment_received',
          title: 'Payment Received',
          description: 'Received payment for mobile app UI design',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          amount: 180,
          user: 'Sarah Johnson',
          icon: '💰'
        },
        {
          id: 3,
          type: 'new_application',
          title: 'New Task Application',
          description: 'Received application for logo design project',
          timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
          user: 'Mike Chen',
          icon: '📝'
        }
      ],
      insights: {
        recommendations: [
          'Consider expanding to mobile development - high demand',
          'Your response time is excellent - highlight this in your profile',
          'Peak activity hours are 2-6 PM - schedule accordingly'
        ],
        marketTrends: [
          'React development services show 25% growth this month',
          'UI/UX design tasks are in high demand',
          'Mobile-first projects are trending upward'
        ],
        platformStats: {
          totalUsers: 15420,
          tasksPosted: 2840,
          avgTaskValue: 125,
          successRate: 92
        }
      },
      lastUpdated: now.toISOString(),
      userType: userData.userType || userData.primaryRole
    };

    return baseData;
  }, []);

  // Stable refresh function
  const refreshDashboard = useCallback(async () => {
    if (!user || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockData = generateMockDashboardData(user);
      setDashboardData(mockData);
      setLastUpdated(new Date().toISOString());
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
      setError('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, loading, generateMockDashboardData]);

  // Initialize dashboard data when user changes - only once per user
  useEffect(() => {
    if (user && user.id !== userIdRef.current) {
      userIdRef.current = user.id;
      initializationRef.current = false;
    }

    if (user && !initializationRef.current && !loading) {
      initializationRef.current = true;
      refreshDashboard();
    }
  }, [user?.id, refreshDashboard, loading]);

  // Setup socket listeners - separate effect to prevent loops
  useEffect(() => {
    if (!socket || !user) return;

    const handleDashboardUpdate = (update) => {
      setDashboardData(prev => prev ? { ...prev, ...update } : update);
      setLastUpdated(new Date().toISOString());
    };

    const handleStatsUpdate = (stats) => {
      setDashboardData(prev => 
        prev ? {
          ...prev,
          stats: { ...prev.stats, ...stats }
        } : null
      );
    };

    socket.on('dashboard_update', handleDashboardUpdate);
    socket.on('stats_update', handleStatsUpdate);

    return () => {
      socket.off('dashboard_update', handleDashboardUpdate);
      socket.off('stats_update', handleStatsUpdate);
    };
  }, [socket, user?.id]);

  // Stable update functions
  const updateStats = useCallback((newStats) => {
    setDashboardData(prev => 
      prev ? {
        ...prev,
        stats: { ...prev.stats, ...newStats }
      } : null
    );
    setLastUpdated(new Date().toISOString());
  }, []);

  const addActivity = useCallback((activity) => {
    const newActivity = {
      id: Date.now(),
      ...activity,
      timestamp: new Date().toISOString()
    };

    setDashboardData(prev => 
      prev ? {
        ...prev,
        activities: [newActivity, ...(prev.activities || []).slice(0, 9)]
      } : null
    );
  }, []);

  const updateEarnings = useCallback((amount, taskTitle) => {
    setDashboardData(prev => {
      if (!prev) return prev;
      
      const today = new Date().toISOString().slice(0, 10);
      const updatedStats = {
        ...prev.stats,
        totalEarnings: (prev.stats.totalEarnings || 0) + amount,
        totalTasks: (prev.stats.totalTasks || 0) + 1,
        creditsEarned: (prev.stats.creditsEarned || 0) + amount
      };

      return {
        ...prev,
        stats: updatedStats,
        earnings: {
          ...prev.earnings,
          thisMonth: (prev.earnings?.thisMonth || 0) + amount
        }
      };
    });

    // Add activity
    addActivity({
      type: 'payment_received',
      title: 'Payment Received',
      description: `Received ${amount} credits for completing "${taskTitle}"`,
      amount,
      icon: '💰'
    });
  }, [addActivity]);

  const exportDashboardData = useCallback((format = 'json') => {
    if (!dashboardData || !user) return null;

    const exportData = {
      exportDate: new Date().toISOString(),
      userType: user.userType || user.primaryRole,
      userName: user.name,
      ...dashboardData
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `timeslice_dashboard_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return exportData;
  }, [dashboardData, user]);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    dashboardData,
    loading,
    error,
    lastUpdated,
    refreshDashboard,
    updateStats,
    addActivity,
    updateEarnings,
    exportDashboardData
  }), [
    dashboardData,
    loading,
    error,
    lastUpdated,
    refreshDashboard,
    updateStats,
    addActivity,
    updateEarnings,
    exportDashboardData
  ]);

  return (
    <DashboardContext.Provider value={contextValue}>
      {children}
    </DashboardContext.Provider>
  );
};

export { DashboardContext, DashboardProvider, useDashboardContext };