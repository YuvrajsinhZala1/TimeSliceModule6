const express = require('express');
const Analytics = require('../models/Analytics');
const Task = require('../models/Task');
const Application = require('../models/Application');
const Booking = require('../models/Booking');
const User = require('../models/User');
const auth = require('../middleware/auth');
const dashboardService = require('../services/dashboardService');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');

const router = express.Router();

// Get dashboard statistics
router.get('/stats', auth, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const userId = req.user.id;

    logger.info('Dashboard stats requested', {
      userId,
      timeRange,
      userRole: req.user.primaryRole
    });

    const startTime = Date.now();
    
    // Get cached data first
    const cacheKey = `dashboard_stats_${userId}_${timeRange}`;
    let stats = await dashboardService.getCachedData(cacheKey);

    if (!stats) {
      // Calculate fresh stats
      stats = await dashboardService.calculateUserStats(userId, timeRange);
      
      // Cache for 5 minutes
      await dashboardService.setCachedData(cacheKey, stats, 5 * 60 * 1000);
      
      logger.debug('Dashboard stats calculated and cached', {
        userId,
        timeRange,
        calculationTime: Date.now() - startTime
      });
    } else {
      logger.debug('Dashboard stats served from cache', { userId, timeRange });
    }

    res.json(stats);

  } catch (error) {
    logger.error('Dashboard stats calculation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timeRange: req.query.timeRange
    });
    
    res.status(500).json({ 
      message: 'Failed to calculate dashboard statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get analytics data
router.get('/analytics', auth, async (req, res) => {
  try {
    const { timeRange = '7d', detailed = false } = req.query;
    const userId = req.user.id;

    logger.info('Dashboard analytics requested', {
      userId,
      timeRange,
      detailed: detailed === 'true'
    });

    const analytics = await analyticsService.getUserAnalytics(
      userId, 
      timeRange, 
      { detailed: detailed === 'true' }
    );

    // Add platform benchmarks for comparison
    const benchmarks = await analyticsService.getPlatformBenchmarks(timeRange);
    analytics.benchmarks = benchmarks;

    res.json(analytics);

  } catch (error) {
    logger.error('Dashboard analytics calculation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      timeRange: req.query.timeRange
    });
    
    res.status(500).json({ 
      message: 'Failed to calculate analytics data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get recent activity
router.get('/activity', auth, async (req, res) => {
  try {
    const { timeRange = '7d', limit = 50, type = 'all' } = req.query;
    const userId = req.user.id;

    logger.info('Dashboard activity requested', {
      userId,
      timeRange,
      limit: parseInt(limit),
      type
    });

    const activity = await dashboardService.getUserActivity(
      userId, 
      timeRange, 
      {
        limit: parseInt(limit),
        type: type === 'all' ? null : type
      }
    );

    res.json(activity);

  } catch (error) {
    logger.error('Dashboard activity fetch failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to fetch activity data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get performance metrics
router.get('/performance', auth, async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    const userId = req.user.id;

    logger.info('Dashboard performance metrics requested', {
      userId,
      timeRange
    });

    const performance = await analyticsService.getUserPerformanceMetrics(userId, timeRange);

    res.json(performance);

  } catch (error) {
    logger.error('Dashboard performance calculation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to calculate performance metrics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Add real-time activity update
router.post('/activity/batch', auth, async (req, res) => {
  try {
    const { activities } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(activities)) {
      return res.status(400).json({ message: 'Activities must be an array' });
    }

    logger.info('Batch activity update received', {
      userId,
      activitiesCount: activities.length
    });

    // Process activities in batches
    const results = await dashboardService.processBatchActivities(userId, activities);

    // Invalidate relevant caches
    await dashboardService.invalidateUserCaches(userId);

    logger.debug('Batch activities processed', {
      userId,
      processed: results.processed,
      failed: results.failed
    });

    res.json(results);

  } catch (error) {
    logger.error('Batch activity processing failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to process batch activities',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get insights and recommendations
router.get('/insights', auth, async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    const userId = req.user.id;

    logger.info('Dashboard insights requested', {
      userId,
      timeRange
    });

    const insights = await analyticsService.generateUserInsights(userId, timeRange);

    res.json(insights);

  } catch (error) {
    logger.error('Dashboard insights generation failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to generate insights',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Export dashboard data
router.get('/export', auth, async (req, res) => {
  try {
    const { format = 'json', timeRange = '30d' } = req.query;
    const userId = req.user.id;

    logger.info('Dashboard export requested', {
      userId,
      format,
      timeRange
    });

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ message: 'Invalid export format. Use json or csv.' });
    }

    const exportData = await dashboardService.exportUserData(userId, timeRange, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-${userId}-${timeRange}-${Date.now()}.csv"`);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-${userId}-${timeRange}-${Date.now()}.json"`);
    }

    logger.info('Dashboard data exported', {
      userId,
      format,
      timeRange,
      dataSize: typeof exportData === 'string' ? exportData.length : JSON.stringify(exportData).length
    });

    res.send(exportData);

  } catch (error) {
    logger.error('Dashboard export failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
      format: req.query.format
    });
    
    res.status(500).json({ 
      message: 'Failed to export dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get comparative analytics (compare with platform averages)
router.get('/compare', auth, async (req, res) => {
  try {
    const { timeRange = '30d', metric = 'all' } = req.query;
    const userId = req.user.id;

    logger.info('Dashboard comparison requested', {
      userId,
      timeRange,
      metric
    });

    const comparison = await analyticsService.getUserComparison(userId, timeRange, metric);

    res.json(comparison);

  } catch (error) {
    logger.error('Dashboard comparison failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to generate comparison data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Update dashboard preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    const { 
      refreshInterval, 
      defaultTimeRange, 
      chartTypes, 
      enableNotifications,
      theme 
    } = req.body;
    const userId = req.user.id;

    logger.info('Dashboard preferences update requested', {
      userId,
      preferences: req.body
    });

    const preferences = await dashboardService.updateUserPreferences(userId, {
      refreshInterval,
      defaultTimeRange,
      chartTypes,
      enableNotifications,
      theme
    });

    res.json(preferences);

  } catch (error) {
    logger.error('Dashboard preferences update failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to update preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get dashboard health status
router.get('/health', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const health = await dashboardService.getDashboardHealth(userId);

    res.json(health);

  } catch (error) {
    logger.error('Dashboard health check failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to check dashboard health',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Force refresh analytics (admin/dev only)
router.post('/refresh', auth, async (req, res) => {
  try {
    const { forceRecalculation = false } = req.body;
    const userId = req.user.id;

    logger.info('Dashboard refresh requested', {
      userId,
      forceRecalculation
    });

    // Clear all caches for user
    await dashboardService.invalidateUserCaches(userId);

    if (forceRecalculation) {
      // Trigger recalculation of analytics
      await analyticsService.recalculateUserAnalytics(userId);
    }

    res.json({ 
      message: 'Dashboard refresh initiated',
      forceRecalculation,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Dashboard refresh failed', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to refresh dashboard',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;