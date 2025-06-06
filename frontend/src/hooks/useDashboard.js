import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
    refreshDashboard, // Use this instead of fetchDashboardData
    lastUpdated
  } = useDashboardContext();

  const logger = useLogger('useDashboard');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  const refreshTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const lastTimeRangeRef = useRef(timeRange);

  // Stable reference to check if data is stale
  const isDataStale = useCallback(() => {
    if (!lastUpdated) return true;
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    return Date.now() - new Date(lastUpdated).getTime() > staleThreshold;
  }, [lastUpdated]);

  // Memoized refresh function with stable dependencies
  const refreshData = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;

    try {
      setLocalLoading(true);
      setLocalError(null);

      logger.debug('Refreshing dashboard data', { 
        timeRange: lastTimeRangeRef.current, 
        forceRefresh
      });

      // Use the context's refresh function
      await refreshDashboard();

      logger.info('Dashboard data refreshed successfully');

    } catch (error) {
      if (mountedRef.current) {
        setLocalError(error.message);
        logger.error('Dashboard refresh failed', {
          error: error.message
        });
      }
    } finally {
      if (mountedRef.current) {
        setLocalLoading(false);
      }
    }
  }, [refreshDashboard, logger]); // Stable dependencies only

  // Update time range ref when it changes
  useEffect(() => {
    lastTimeRangeRef.current = timeRange;
  }, [timeRange]);

  // Initial data fetch - only run once when component mounts
  useEffect(() => {
    let mounted = true;
    
    const initializeDashboard = async () => {
      if (!dashboardData && mounted) {
        logger.info('Initial dashboard data fetch');
        await refreshData(true);
      }
    };

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run on mount

  // Auto-refresh setup - separate from initial fetch
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) {
      return;
    }

    // Clear existing timer
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }

    // Set up new timer
    refreshTimerRef.current = setInterval(() => {
      if (mountedRef.current && !document.hidden && isDataStale()) {
        logger.debug('Auto-refresh triggered');
        refreshData(false);
      }
    }, refreshInterval);

    logger.info('Auto-refresh configured', { interval: refreshInterval });

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval, refreshData, isDataStale, logger]);

  // Handle visibility change - separate effect
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!autoRefresh) return;

      if (document.hidden) {
        logger.debug('Tab hidden, pausing auto-refresh');
        if (refreshTimerRef.current) {
          clearInterval(refreshTimerRef.current);
          refreshTimerRef.current = null;
        }
      } else {
        logger.debug('Tab visible, resuming auto-refresh');
        if (refreshInterval > 0) {
          refreshTimerRef.current = setInterval(() => {
            if (mountedRef.current && isDataStale()) {
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
  }, [autoRefresh, refreshInterval, refreshData, isDataStale, logger]);

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

  // Memoized derived state
  const derivedState = useMemo(() => {
    const loading = contextLoading || localLoading;
    const error = contextError || localError;
    const hasData = !!(dashboardData && Object.keys(dashboardData).length > 0);

    return { loading, error, hasData };
  }, [contextLoading, localLoading, contextError, localError, dashboardData]);

  // Memoized performance score calculation
  const performanceScore = useMemo(() => {
    if (!dashboardData?.stats) return 0;

    try {
      const stats = dashboardData.stats;
      const {
        completionRate = 90,
        avgRating = 4.5,
        totalTasks = 0,
        responseTime = 2
      } = stats;

      // Simple weighted score
      const completionWeight = 0.4;
      const ratingWeight = 0.3;
      const experienceWeight = 0.2;
      const speedWeight = 0.1;

      const normalizedCompletion = Math.min(completionRate / 100, 1);
      const normalizedRating = Math.min(avgRating / 5, 1);
      const normalizedExperience = Math.min(totalTasks / 50, 1);
      const normalizedSpeed = Math.max(0, Math.min(1, (5 - responseTime) / 5));

      const score = (
        normalizedCompletion * completionWeight +
        normalizedRating * ratingWeight +
        normalizedExperience * experienceWeight +
        normalizedSpeed * speedWeight
      ) * 100;

      return Math.round(score);
    } catch (error) {
      logger.error('Performance score calculation failed', { error: error.message });
      return 0;
    }
  }, [dashboardData, logger]);

  // Memoized activity summary
  const activitySummary = useMemo(() => {
    if (!recentActivity || recentActivity.length === 0) {
      return { total: 0, today: 0, week: 0, types: {} };
    }

    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const summary = recentActivity.reduce((acc, activity) => {
        const activityDate = new Date(activity.timestamp || activity.createdAt);
        
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
      }, { total: 0, today: 0, week: 0, types: {} });

      return summary;
    } catch (error) {
      logger.error('Activity summary calculation failed', { error: error.message });
      return { total: 0, today: 0, week: 0, types: {} };
    }
  }, [recentActivity, logger]);

  // Return stable interface
  return {
    // Data
    dashboardData,
    analyticsData,
    recentActivity,
    performanceMetrics,
    
    // State
    loading: derivedState.loading,
    error: derivedState.error,
    hasData: derivedState.hasData,
    
    // Actions
    refreshData,
    
    // Computed values
    performanceScore,
    activitySummary,
    
    // Utilities
    isStale: isDataStale(),
    lastRefresh: lastUpdated ? new Date(lastUpdated) : null,
    
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