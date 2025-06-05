import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from './AuthContext';
import { useLogger } from '../hooks/useLogger';

const DashboardContext = createContext();

export const useDashboardContext = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const logger = useLogger();

  // Dashboard state
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Real-time updates
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [updateQueue, setUpdateQueue] = useState([]);

  // Cache management
  const [cache, setCache] = useState(new Map());
  const [cacheExpiry, setCacheExpiry] = useState(5 * 60 * 1000); // 5 minutes

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (timeRange = '7d', forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Fetching dashboard data', { 
        timeRange, 
        forceRefresh,
        userId: currentUser?.id 
      });

      // Check cache first
      const cacheKey = `dashboard_${timeRange}_${currentUser?.id}`;
      const cachedData = cache.get(cacheKey);
      
      if (!forceRefresh && cachedData && Date.now() - cachedData.timestamp < cacheExpiry) {
        logger.debug('Using cached dashboard data', { cacheKey });
        setDashboardData(cachedData.data);
        setLastUpdated(new Date(cachedData.timestamp));
        setLoading(false);
        return cachedData.data;
      }

      // Fetch fresh data
      const [statsRes, analyticsRes, activityRes, performanceRes] = await Promise.all([
        api.get(`/dashboard/stats?timeRange=${timeRange}`),
        api.get(`/dashboard/analytics?timeRange=${timeRange}`),
        api.get(`/dashboard/activity?timeRange=${timeRange}&limit=50`),
        api.get(`/dashboard/performance?timeRange=${timeRange}`)
      ]);

      const newDashboardData = {
        stats: statsRes.data,
        analytics: analyticsRes.data,
        activity: activityRes.data,
        performance: performanceRes.data,
        timeRange,
        timestamp: Date.now()
      };

      // Update cache
      setCache(prev => new Map(prev.set(cacheKey, {
        data: newDashboardData,
        timestamp: Date.now()
      })));

      // Update state
      setDashboardData(newDashboardData.stats);
      setAnalyticsData(newDashboardData.analytics);
      setRecentActivity(newDashboardData.activity);
      setPerformanceMetrics(newDashboardData.performance);
      setLastUpdated(new Date());

      logger.info('Dashboard data fetched successfully', { 
        timeRange,
        dataSize: JSON.stringify(newDashboardData).length,
        cacheKey
      });

      return newDashboardData;

    } catch (error) {
      const errorMessage = `Failed to fetch dashboard data: ${error.message}`;
      setError(errorMessage);
      
      logger.error('Dashboard data fetch failed', {
        error: error.message,
        stack: error.stack,
        timeRange,
        userId: currentUser?.id
      });

      throw error;
    } finally {
      setLoading(false);
    }
  }, [currentUser, cache, cacheExpiry, logger]);

  // Real-time activity updates
  const addActivityUpdate = useCallback((activity) => {
    try {
      logger.debug('Adding real-time activity update', { activity });

      setRecentActivity(prev => {
        // Avoid duplicates
        const exists = prev.some(item => item.id === activity.id);
        if (exists) return prev;

        // Add to beginning and limit to 100 items
        return [activity, ...prev].slice(0, 100);
      });

      // Add to update queue for batch processing
      setUpdateQueue(prev => [...prev, activity]);

      logger.debug('Activity update added successfully');
    } catch (error) {
      logger.error('Failed to add activity update', {
        error: error.message,
        activity
      });
    }
  }, [logger]);

  // Process update queue
  const processUpdateQueue = useCallback(async () => {
    if (updateQueue.length === 0) return;

    try {
      logger.debug('Processing update queue', { queueSize: updateQueue.length });

      // Process updates in batches
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < updateQueue.length; i += batchSize) {
        batches.push(updateQueue.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        await api.post('/dashboard/activity/batch', { activities: batch });
      }

      setUpdateQueue([]);
      logger.info('Update queue processed successfully', { 
        batchCount: batches.length,
        totalUpdates: updateQueue.length 
      });

    } catch (error) {
      logger.error('Failed to process update queue', {
        error: error.message,
        queueSize: updateQueue.length
      });
    }
  }, [updateQueue, logger]);

  // Clean old cache entries
  const cleanCache = useCallback(() => {
    try {
      const now = Date.now();
      const keysToDelete = [];

      cache.forEach((value, key) => {
        if (now - value.timestamp > cacheExpiry) {
          keysToDelete.push(key);
        }
      });

      if (keysToDelete.length > 0) {
        setCache(prev => {
          const newCache = new Map(prev);
          keysToDelete.forEach(key => newCache.delete(key));
          return newCache;
        });

        logger.debug('Cache cleaned', { 
          removedKeys: keysToDelete.length,
          totalKeys: cache.size - keysToDelete.length
        });
      }
    } catch (error) {
      logger.error('Cache cleaning failed', { error: error.message });
    }
  }, [cache, cacheExpiry, logger]);

  // Update single metric
  const updateMetric = useCallback((metricPath, value) => {
    try {
      logger.debug('Updating single metric', { metricPath, value });

      setDashboardData(prev => {
        if (!prev) return prev;

        const newData = { ...prev };
        const pathArray = metricPath.split('.');
        let current = newData;

        // Navigate to the parent of the target property
        for (let i = 0; i < pathArray.length - 1; i++) {
          if (!current[pathArray[i]]) {
            current[pathArray[i]] = {};
          }
          current = current[pathArray[i]];
        }

        // Update the target property
        current[pathArray[pathArray.length - 1]] = value;
        return newData;
      });

      logger.debug('Metric updated successfully', { metricPath, value });
    } catch (error) {
      logger.error('Failed to update metric', {
        error: error.message,
        metricPath,
        value
      });
    }
  }, [logger]);

  // Export dashboard data
  const exportDashboardData = useCallback(async (format = 'json', timeRange = '30d') => {
    try {
      logger.info('Exporting dashboard data', { format, timeRange });

      const response = await api.get(`/dashboard/export`, {
        params: { format, timeRange },
        responseType: format === 'csv' ? 'blob' : 'json'
      });

      if (format === 'csv') {
        // Handle CSV download
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-data-${timeRange}-${Date.now()}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      }

      logger.info('Dashboard data exported successfully', { format, timeRange });
      return response.data;

    } catch (error) {
      logger.error('Dashboard export failed', {
        error: error.message,
        format,
        timeRange
      });
      throw error;
    }
  }, [logger]);

  // Set up periodic tasks
  useEffect(() => {
    if (!currentUser) return;

    // Set up cache cleaning interval
    const cacheCleanInterval = setInterval(cleanCache, 60000); // Every minute

    // Set up update queue processing
    const queueProcessInterval = setInterval(processUpdateQueue, 10000); // Every 10 seconds

    logger.info('Dashboard context initialized', {
      userId: currentUser.id,
      realTimeEnabled
    });

    return () => {
      clearInterval(cacheCleanInterval);
      clearInterval(queueProcessInterval);
      logger.info('Dashboard context cleanup completed');
    };
  }, [currentUser, cleanCache, processUpdateQueue, realTimeEnabled, logger]);

  // Context value
  const value = {
    // Data
    dashboardData,
    analyticsData,
    recentActivity,
    performanceMetrics,
    
    // State
    loading,
    error,
    lastUpdated,
    realTimeEnabled,
    
    // Actions
    fetchDashboardData,
    addActivityUpdate,
    updateMetric,
    exportDashboardData,
    setRealTimeEnabled,
    
    // Cache management
    cache: cache.size,
    clearCache: () => {
      setCache(new Map());
      logger.info('Cache cleared manually');
    },
    
    // Utils
    isDataStale: () => {
      if (!lastUpdated) return true;
      return Date.now() - lastUpdated.getTime() > cacheExpiry;
    }
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};