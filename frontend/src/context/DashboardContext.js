// File: src/context/DashboardContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
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

  // Generate mock dashboard data
  const generateMockDashboardData = (userData) => {
    if (!userData) return null;
    
    const isHelper = userData.userType === 'helper';
    const now = new Date();

    // Generate earnings data for last 6 months
    const monthlyEarnings = Array.from({ length: 6 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const baseEarnings = isHelper ? 400 : 200;
      const variance = Math.random() * 0.4 + 0.8; // 80-120% of base
      
      return {
        month: date.toISOString().slice(0, 7),
        earnings: Math.round(baseEarnings * variance),
        tasks: Math.floor(Math.random() * 10) + (isHelper ? 8 : 4),
        date: date.toISOString()
      };
    });

    // Generate daily earnings for last 30 days
    const dailyEarnings = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (29 - i));
      
      const baseDaily = isHelper ? 25 : 12;
      const dayOfWeek = date.getDay();
      const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.7 : 1;
      const variance = Math.random() * 0.6 + 0.7;
      
      return {
        date: date.toISOString().slice(0, 10),
        earnings: Math.round(baseDaily * weekendMultiplier * variance),
        tasks: Math.floor(Math.random() * 3),
        hours: Math.round((Math.random() * 6 + 2) * 10) / 10
      };
    });

    // Performance data
    const performanceData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      
      return {
        date: date.toISOString().slice(0, 10),
        tasks: Math.floor(Math.random() * 4) + 1,
        rating: Math.round((Math.random() * 1 + 4) * 10) / 10,
        responseTime: Math.round((Math.random() * 3 + 1) * 10) / 10,
        completionRate: Math.round((Math.random() * 15 + 85) * 10) / 10
      };
    });

    // Activity data
    const activities = [
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
      },
      {
        id: 4,
        type: 'review_received',
        title: 'New 5-Star Review',
        description: 'Received excellent review for web development work',
        timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
        rating: 5,
        user: 'Emma Wilson',
        icon: '⭐'
      },
      {
        id: 5,
        type: 'milestone_achieved',
        title: 'Milestone Achieved',
        description: 'Completed 50+ tasks with 4.8+ average rating',
        timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        icon: '🎯'
      }
    ];

    // Calculate totals
    const totalEarnings = monthlyEarnings.reduce((sum, month) => sum + month.earnings, 0);
    const totalTasks = monthlyEarnings.reduce((sum, month) => sum + month.tasks, 0);
    const avgRating = Math.round((Math.random() * 0.8 + 4.2) * 10) / 10;
    const currentMonth = monthlyEarnings[monthlyEarnings.length - 1];
    const previousMonth = monthlyEarnings[monthlyEarnings.length - 2];
    const earningsGrowth = previousMonth.earnings > 0 
      ? Math.round(((currentMonth.earnings - previousMonth.earnings) / previousMonth.earnings) * 100)
      : 0;

    return {
      stats: {
        totalEarnings,
        totalTasks,
        avgRating,
        activeBookings: Math.floor(Math.random() * 5) + 2,
        creditsEarned: totalEarnings + Math.floor(Math.random() * 200),
        creditsSpent: Math.floor(totalEarnings * 0.3),
        completionRate: Math.round((Math.random() * 10 + 90) * 10) / 10,
        responseTime: Math.round((Math.random() * 2 + 1) * 10) / 10,
        customerSatisfaction: Math.round((Math.random() * 8 + 92) * 10) / 10,
        earningsGrowth
      },
      earnings: {
        monthly: monthlyEarnings,
        daily: dailyEarnings,
        thisMonth: currentMonth.earnings,
        lastMonth: previousMonth.earnings,
        growth: earningsGrowth
      },
      performance: {
        data: performanceData,
        avgResponseTime: Math.round((Math.random() * 2 + 2) * 10) / 10,
        completionRate: Math.round((Math.random() * 10 + 90) * 10) / 10,
        customerSatisfaction: Math.round((Math.random() * 8 + 92) * 10) / 10,
        repeatCustomers: Math.round((Math.random() * 20 + 50) * 10) / 10
      },
      activities,
      trends: {
        topSkills: [
          { skill: 'React Development', count: 15, growth: 25 },
          { skill: 'UI/UX Design', count: 12, growth: 18 },
          { skill: 'Node.js', count: 8, growth: 12 },
          { skill: 'Mobile Development', count: 6, growth: 35 },
          { skill: 'WordPress', count: 5, growth: -5 }
        ],
        peakHours: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          activity: Math.round((Math.random() * 60 + 40) * 10) / 10,
          label: `${hour.toString().padStart(2, '0')}:00`
        })),
        categoryDistribution: [
          { category: 'Web Development', percentage: 40, count: 24 },
          { category: 'Design', percentage: 30, count: 18 },
          { category: 'Mobile Apps', percentage: 20, count: 12 },
          { category: 'Content', percentage: 10, count: 6 }
        ]
      },
      insights: {
        recommendations: [
          'Consider expanding to mobile development - 35% growth in demand',
          'Your response time is excellent - highlight this in your profile',
          'Peak activity hours are 2-6 PM - schedule availability accordingly',
          'Client retention rate is above average - great job!',
          'Portfolio updates can increase booking rate by 40%'
        ].slice(0, 3),
        marketTrends: [
          'React development services show 25% growth this month',
          'UI/UX design tasks are in high demand across all price ranges',
          'Mobile-first projects are trending upward',
          'Short-term tasks (< 4 hours) show higher completion rates'
        ].slice(0, 3),
        platformStats: {
          totalUsers: 15420 + Math.floor(Math.random() * 100),
          tasksPosted: 2840 + Math.floor(Math.random() * 50),
          avgTaskValue: 125 + Math.floor(Math.random() * 20),
          successRate: Math.round((Math.random() * 5 + 92) * 10) / 10
        }
      },
      lastUpdated: now.toISOString(),
      userType: userData.userType
    };
  };

  // Initialize dashboard data when user changes
  useEffect(() => {
    if (user) {
      setLoading(true);
      setError(null);
      
      // Simulate API delay
      const timer = setTimeout(() => {
        try {
          const mockData = generateMockDashboardData(user);
          setDashboardData(mockData);
          setLastUpdated(new Date());
        } catch (error) {
          console.error('Failed to generate dashboard data:', error);
          setError('Failed to load dashboard data');
        } finally {
          setLoading(false);
        }
      }, 800);

      return () => clearTimeout(timer);
    } else {
      setDashboardData(null);
      setLoading(false);
    }
  }, [user?.id]); // Only depend on user ID to prevent loops

  // Setup socket listeners - separate effect
  useEffect(() => {
    if (!socket || !user) return;

    // Listen for dashboard updates
    const handleDashboardUpdate = (update) => {
      setDashboardData(prev => ({
        ...prev,
        ...update
      }));
      setLastUpdated(new Date());
    };

    // Listen for stats updates
    const handleStatsUpdate = (stats) => {
      setDashboardData(prev => ({
        ...prev,
        stats: {
          ...prev?.stats,
          ...stats
        }
      }));
    };

    socket.on('dashboard_update', handleDashboardUpdate);
    socket.on('stats_update', handleStatsUpdate);

    return () => {
      socket.off('dashboard_update', handleDashboardUpdate);
      socket.off('stats_update', handleStatsUpdate);
    };
  }, [socket, user?.id]);

  // Refresh dashboard data
  const refreshDashboard = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockData = generateMockDashboardData(user);
      setDashboardData(mockData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh dashboard data:', error);
      setError('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Update specific stats
  const updateStats = (newStats) => {
    setDashboardData(prev => ({
      ...prev,
      stats: {
        ...prev?.stats,
        ...newStats
      }
    }));
    setLastUpdated(new Date());
  };

  // Add new activity
  const addActivity = (activity) => {
    const newActivity = {
      id: Date.now(),
      ...activity,
      timestamp: new Date().toISOString()
    };

    setDashboardData(prev => ({
      ...prev,
      activities: [newActivity, ...(prev?.activities || []).slice(0, 9)] // Keep only last 10
    }));
  };

  // Update earnings
  const updateEarnings = (amount, taskTitle) => {
    setDashboardData(prev => {
      if (!prev) return prev;
      
      const today = new Date().toISOString().slice(0, 10);
      const updatedDaily = prev.earnings.daily.map(day => 
        day.date === today 
          ? { ...day, earnings: day.earnings + amount, tasks: day.tasks + 1 }
          : day
      );

      const updatedStats = {
        ...prev.stats,
        totalEarnings: prev.stats.totalEarnings + amount,
        totalTasks: prev.stats.totalTasks + 1,
        creditsEarned: prev.stats.creditsEarned + amount
      };

      return {
        ...prev,
        stats: updatedStats,
        earnings: {
          ...prev.earnings,
          daily: updatedDaily,
          thisMonth: prev.earnings.thisMonth + amount
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
  };

  // Export dashboard data
  const exportDashboardData = (format = 'json') => {
    if (!dashboardData || !user) return null;

    const exportData = {
      exportDate: new Date().toISOString(),
      userType: user.userType,
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
  };

  const value = {
    dashboardData,
    loading,
    error,
    lastUpdated,
    refreshDashboard,
    updateStats,
    addActivity,
    updateEarnings,
    exportDashboardData
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export { DashboardContext, DashboardProvider, useDashboardContext };