// File: src/hooks/useAnalytics.js
import { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLogger } from './useLogger';
import * as analyticsUtils from '../utils/analyticsUtils';
import api from '../utils/api';

/**
 * Custom hook for managing analytics data and tracking
 * Provides comprehensive analytics functionality for the TimeSlice platform
 */
const useAnalytics = (options = {}) => {
  const {
    autoRefresh = true,
    refreshInterval = 300000, // 5 minutes
    trackUserEvents = true,
    enablePerformanceTracking = true
  } = options;

  const [analyticsData, setAnalyticsData] = useState({
    earnings: {
      daily: [],
      weekly: [],
      monthly: [],
      total: 0,
      growth: 0
    },
    performance: {
      tasksCompleted: 0,
      averageRating: 0,
      responseTime: 0,
      completionRate: 0,
      customerSatisfaction: 0
    },
    trends: {
      topSkills: [],
      peakHours: [],
      popularCategories: [],
      demandForecast: []
    },
    insights: {
      recommendations: [],
      marketTrends: [],
      optimizationSuggestions: []
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { user } = useContext(AuthContext);
  const logger = useLogger('useAnalytics');

  // Track user events
  const trackEvent = useCallback(async (eventName, eventData = {}) => {
    if (!trackUserEvents || !user) return;

    try {
      const eventPayload = {
        event: eventName,
        userId: user.id,
        timestamp: new Date().toISOString(),
        sessionId: analyticsUtils.getSessionId(),
        data: {
          ...eventData,
          userAgent: navigator.userAgent,
          url: window.location.href,
          referrer: document.referrer
        }
      };

      // Log event locally
      logger.info('Analytics event tracked', eventPayload);

      // Send to backend (when available)
      try {
        await api.post('/analytics/events', eventPayload);
      } catch (apiError) {
        // Store in localStorage for later sync
        analyticsUtils.storeEventLocally(eventPayload);
        logger.warn('Analytics event stored locally for later sync', { error: apiError.message });
      }

    } catch (error) {
      logger.error('Failed to track analytics event', { 
        eventName, 
        error: error.message 
      });
    }
  }, [user, trackUserEvents, logger]);

  // Track page views
  const trackPageView = useCallback((pageName, additionalData = {}) => {
    trackEvent('page_view', {
      page: pageName,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  }, [trackEvent]);

  // Track user interactions
  const trackInteraction = useCallback((action, target, additionalData = {}) => {
    trackEvent('user_interaction', {
      action,
      target,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  }, [trackEvent]);

  // Track task-related events
  const trackTaskEvent = useCallback((eventType, taskData = {}) => {
    trackEvent('task_event', {
      eventType,
      taskId: taskData.id,
      category: taskData.category,
      credits: taskData.credits,
      duration: taskData.duration,
      timestamp: new Date().toISOString(),
      ...taskData
    });
  }, [trackEvent]);

  // Track performance metrics
  const trackPerformance = useCallback((metricName, value, additionalData = {}) => {
    if (!enablePerformanceTracking) return;

    trackEvent('performance_metric', {
      metric: metricName,
      value,
      timestamp: new Date().toISOString(),
      ...additionalData
    });
  }, [trackEvent, enablePerformanceTracking]);

  // Fetch analytics data from API or generate mock data
  const fetchAnalyticsData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      logger.info('Fetching analytics data', { userId: user.id });

      // Try to fetch from API first
      try {
        const response = await api.get(`/analytics/dashboard/${user.id}`);
        const apiData = response.data;
        
        setAnalyticsData(apiData);
        setLastUpdated(new Date());
        logger.info('Analytics data fetched from API', { dataKeys: Object.keys(apiData) });
        
      } catch (apiError) {
        // Generate mock data for development
        logger.warn('API unavailable, generating mock analytics data');
        const mockData = analyticsUtils.generateMockAnalyticsData(user);
        
        setAnalyticsData(mockData);
        setLastUpdated(new Date());
      }

    } catch (error) {
      logger.error('Failed to fetch analytics data', { error: error.message });
      setError(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [user, logger]);

  // Refresh analytics data
  const refreshAnalytics = useCallback(async () => {
    logger.info('Refreshing analytics data');
    await fetchAnalyticsData();
  }, [fetchAnalyticsData, logger]);

  // Calculate derived metrics
  const getDerivedMetrics = useCallback(() => {
    return analyticsUtils.calculateDerivedMetrics(analyticsData);
  }, [analyticsData]);

  // Get performance score
  const getPerformanceScore = useCallback(() => {
    return analyticsUtils.calculatePerformanceScore(analyticsData.performance);
  }, [analyticsData.performance]);

  // Get earnings growth
  const getEarningsGrowth = useCallback((period = 'monthly') => {
    return analyticsUtils.calculateEarningsGrowth(analyticsData.earnings, period);
  }, [analyticsData.earnings]);

  // Get top performing categories
  const getTopCategories = useCallback((limit = 5) => {
    return analyticsUtils.getTopPerformingCategories(analyticsData.trends, limit);
  }, [analyticsData.trends]);

  // Export analytics data
  const exportData = useCallback(async (format = 'csv', dateRange = null) => {
    try {
      logger.info('Exporting analytics data', { format, dateRange });
      
      const exportData = analyticsUtils.prepareExportData(analyticsData, dateRange);
      
      if (format === 'csv') {
        return analyticsUtils.exportToCSV(exportData);
      } else if (format === 'json') {
        return analyticsUtils.exportToJSON(exportData);
      } else if (format === 'pdf') {
        return analyticsUtils.exportToPDF(exportData);
      }
      
    } catch (error) {
      logger.error('Failed to export analytics data', { error: error.message });
      throw error;
    }
  }, [analyticsData, logger]);

  // Sync locally stored events
  const syncLocalEvents = useCallback(async () => {
    try {
      const localEvents = analyticsUtils.getLocalEvents();
      if (localEvents.length === 0) return;

      logger.info('Syncing local analytics events', { count: localEvents.length });
      
      await api.post('/analytics/events/batch', { events: localEvents });
      analyticsUtils.clearLocalEvents();
      
      logger.info('Local events synced successfully');
    } catch (error) {
      logger.error('Failed to sync local events', { error: error.message });
    }
  }, [logger]);

  // Initialize analytics
  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
      syncLocalEvents();
      
      // Track session start
      trackEvent('session_start', {
        userType: user.userType,
        credits: user.credits
      });
    }
  }, [user, fetchAnalyticsData, syncLocalEvents, trackEvent]);

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh || !user) return;

    const interval = setInterval(() => {
      fetchAnalyticsData();
      syncLocalEvents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, user, fetchAnalyticsData, syncLocalEvents]);

  // Track page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        trackEvent('page_hidden');
      } else {
        trackEvent('page_visible');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [trackEvent]);

  // Track performance metrics
  useEffect(() => {
    if (!enablePerformanceTracking) return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          trackPerformance('page_load_time', entry.loadEventEnd - entry.loadEventStart);
        } else if (entry.entryType === 'paint') {
          trackPerformance(entry.name, entry.startTime);
        }
      });
    });

    observer.observe({ entryTypes: ['navigation', 'paint'] });
    
    return () => observer.disconnect();
  }, [enablePerformanceTracking, trackPerformance]);

  return {
    // Data
    analyticsData,
    loading,
    error,
    lastUpdated,
    
    // Actions
    refreshAnalytics,
    exportData,
    
    // Tracking functions
    trackEvent,
    trackPageView,
    trackInteraction,
    trackTaskEvent,
    trackPerformance,
    
    // Derived data
    getDerivedMetrics,
    getPerformanceScore,
    getEarningsGrowth,
    getTopCategories,
    
    // Utility
    syncLocalEvents
  };
};

export default useAnalytics;