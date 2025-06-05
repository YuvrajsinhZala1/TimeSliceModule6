import { useState, useEffect, useCallback, useRef } from 'react';
import { useDashboardContext } from '../context/DashboardContext';
import { useLogger } from './useLogger';

export const useDashboard = (timeRange = '7d', autoRefresh = true, refreshInterval = 30000) => {
  const {
    dashboardData,
    analyticsData,
    recentActivity,
    performanceMetrics,
    loading: contextLoading,
    error: contextError,
    fetchDashboardData,
    isDataStale
  } = useDashboardContext();

  const logger = useLogger();
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(true);

  // Refresh data function
  const refreshData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;

    try {
      setLocalLoading(true);
      setLocalError(null);

      logger.debug('Refreshing dashboard data', { 
        timeRange, 
        forceRefresh,
        isStale: isDataStale()
      });

      await fetchDashboardData(timeRange, forceRefresh);

      logger.info('Dashboard data refreshed successfully', { timeRange });

    } catch (error) {
      if (mountedRef.current) {
        setLocalError(error.message);
        logger.error('Dashboard refresh failed', {
          error: error.message,
          timeRange
        });
      }
    } finally {
      if (mountedRef.current) {
        setLocalLoading(false);
      }
    }
  }, [timeRange, fetchDashboardData, isDataStale, logger]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    // Clear existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Set up new timer
    refreshTimerRef.current = setInterval(() => {
      if (mountedRef.current && !document.hidden) {
        logger.debug('Auto-refresh triggered', { 
          interval: refreshInterval,
          timeRange 
        });
        refreshData(false);
      }
    }, refreshInterval);

    logger.info('Auto-refresh configured', { 
      interval: refreshInterval,
      timeRange 
    });

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, timeRange, refreshData, logger]);

  // Initial data fetch
  useEffect(() => {
    if (!dashboardData || isDataStale()) {
      logger.info('Initial dashboard data fetch', { timeRange });
      refreshData(true);
    }
  }, [timeRange]);

  // Handle visibility change (pause refresh when tab is hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logger.debug('Tab hidden, pausing auto-refresh');
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      } else {
        logger.debug('Tab visible, resuming auto-refresh');
        if (autoRefresh && refreshInterval > 0) {
          refreshTimerRef.current = setInterval(() => {
            if (mountedRef.current) {
              refreshData(false);
            }
          }, refreshInterval);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoRefresh, refreshInterval, refreshData, logger]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      logger.debug('useDashboard hook cleanup completed');
    };
  }, [logger]);

  // Derived state
  const loading = contextLoading || localLoading;
  const error = contextError || localError;
  const hasData = !!(dashboardData && analyticsData);

  // Performance metrics calculation
  const calculatePerformanceScore = useCallback(() => {
    if (!dashboardData) return 0;

    try {
      const {
        applicationSuccessRate = 0,
        rating = 0,
        completedTasks = 0,
        totalRatings = 0
      } = dashboardData;

      // Weighted score calculation
      const successWeight = 0.4;
      const ratingWeight = 0.3;
      const experienceWeight = 0.2;
      const consistencyWeight = 0.1;

      const normalizedSuccess = Math.min(applicationSuccessRate / 100, 1);
      const normalizedRating = Math.min(rating / 5, 1);
      const normalizedExperience = Math.min(completedTasks / 50, 1);
      const normalizedConsistency = Math.min(totalRatings / 20, 1);

      const score = (
        normalizedSuccess * successWeight +
        normalizedRating * ratingWeight +
        normalizedExperience * experienceWeight +
        normalizedConsistency * consistencyWeight
      ) * 100;

      logger.debug('Performance score calculated', {
        score: Math.round(score),
        components: {
          success: normalizedSuccess,
          rating: normalizedRating,
          experience: normalizedExperience,
          consistency: normalizedConsistency
        }
      });

      return Math.round(score);
    } catch (error) {
      logger.error('Performance score calculation failed', {
        error: error.message
      });
      return 0;
    }
  }, [dashboardData, logger]);

  // Activity summary
  const getActivitySummary = useCallback(() => {
    if (!recentActivity || recentActivity.length === 0) {
      return {
        total: 0,
        today: 0,
        week: 0,
        types: {}
      };
    }

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const summary = recentActivity.reduce((acc, activity) => {
        const activityDate = new Date(activity.createdAt);
        
        acc.total++;
        
        if (activityDate >= today) {
          acc.today++;
        }
        
        if (activityDate >= weekAgo) {
          acc.week++;
        }
        
        const type = activity.type || 'unknown';
        acc.types[type] = (acc.types[type] || 0) + 1;
        
        return acc;
      }, {
        total: 0,
        today: 0,
        week: 0,
        types: {}
      });

      logger.debug('Activity summary calculated', summary);
      return summary;

    } catch (error) {
      logger.error('Activity summary calculation failed', {
        error: error.message
      });
      return {
        total: 0,
        today: 0,
        week: 0,
        types: {}
      };
    }
  }, [recentActivity, logger]);

  // Return hook interface
  return {
    // Data
    dashboardData,
    analyticsData,
    recentActivity,
    performanceMetrics,
    
    // State
    loading,
    error,
    hasData,
    
    // Actions
    refreshData,
    
    // Computed values
    performanceScore: calculatePerformanceScore(),
    activitySummary: getActivitySummary(),
    
    // Utilities
    isStale: isDataStale(),
    lastRefresh: dashboardData?.timestamp ? new Date(dashboardData.timestamp) : null,
    
    // Debug info
    debugInfo: {
      timeRange,
      autoRefresh,
      refreshInterval,
      hasTimer: !!refreshTimerRef.current,
      mounted: mountedRef.current,
      dataSize: dashboardData ? JSON.stringify(dashboardData).length : 0
    }
  };
};