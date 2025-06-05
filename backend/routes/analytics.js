const express = require('express');
const Analytics = require('../models/Analytics');
const Task = require('../models/Task');
const Application = require('../models/Application');
const Booking = require('../models/Booking');
const User = require('../models/User');
const auth = require('../middleware/auth');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');
const { validationResult, query, param } = require('express-validator');

const router = express.Router();

// Validation middleware
const validateTimeRange = [
  query('timeRange')
    .optional()
    .isIn(['1d', '7d', '30d', '90d', '1y'])
    .withMessage('Invalid time range. Must be one of: 1d, 7d, 30d, 90d, 1y'),
  query('detailed')
    .optional()
    .isBoolean()
    .withMessage('Detailed must be a boolean value')
];

const validateUserId = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Analytics validation failed', {
      errors: errors.array(),
      userId: req.user?.id,
      path: req.path
    });
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Get user analytics data
router.get('/user/:userId', 
  auth, 
  validateUserId, 
  validateTimeRange, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeRange = '7d', detailed = false } = req.query;

      // Authorization check - users can only access their own analytics
      if (req.user.id !== userId && req.user.role !== 'admin') {
        logger.logSecurity('unauthorized_analytics_access', {
          requestingUser: req.user.id,
          targetUser: userId,
          ip: req.ip
        });
        return res.status(403).json({ 
          message: 'Access denied. You can only view your own analytics.' 
        });
      }

      logger.info('User analytics requested', {
        userId,
        timeRange,
        detailed: detailed === 'true',
        requestedBy: req.user.id
      });

      const startTime = Date.now();

      // Get analytics data using service
      const analytics = await analyticsService.getUserAnalytics(
        userId, 
        timeRange, 
        { detailed: detailed === 'true' }
      );

      const processingTime = Date.now() - startTime;

      logger.logPerformance('user_analytics_fetch', processingTime, {
        userId,
        timeRange,
        detailed,
        dataSize: JSON.stringify(analytics).length
      });

      res.json({
        success: true,
        data: analytics,
        meta: {
          userId,
          timeRange,
          detailed: detailed === 'true',
          generatedAt: new Date(),
          processingTime: `${processingTime}ms`
        }
      });

    } catch (error) {
      logger.error('User analytics fetch failed', {
        error: error.message,
        stack: error.stack,
        userId: req.params.userId,
        requestedBy: req.user?.id
      });
      
      res.status(500).json({ 
        message: 'Failed to fetch user analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Get current user's analytics (convenience endpoint)
router.get('/me', 
  auth, 
  validateTimeRange, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const { timeRange = '7d', detailed = false } = req.query;
      const userId = req.user.id;

      logger.info('Current user analytics requested', {
        userId,
        timeRange,
        detailed: detailed === 'true'
      });

      const analytics = await analyticsService.getUserAnalytics(
        userId, 
        timeRange, 
        { detailed: detailed === 'true' }
      );

      res.json({
        success: true,
        data: analytics,
        meta: {
          userId,
          timeRange,
          detailed: detailed === 'true',
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Current user analytics fetch failed', {
        error: error.message,
        userId: req.user?.id
      });
      
      res.status(500).json({ 
        message: 'Failed to fetch your analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Get platform benchmarks
router.get('/benchmarks', 
  auth, 
  validateTimeRange, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;

      logger.info('Platform benchmarks requested', {
        timeRange,
        requestedBy: req.user.id
      });

      const benchmarks = await analyticsService.getPlatformBenchmarks(timeRange);

      res.json({
        success: true,
        data: benchmarks,
        meta: {
          timeRange,
          type: 'platform_benchmarks',
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Platform benchmarks fetch failed', {
        error: error.message,
        requestedBy: req.user?.id
      });
      
      res.status(500).json({ 
        message: 'Failed to fetch platform benchmarks',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Get user insights and recommendations
router.get('/insights/:userId', 
  auth, 
  validateUserId, 
  validateTimeRange, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeRange = '30d' } = req.query;

      // Authorization check
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. You can only view your own insights.' 
        });
      }

      logger.info('User insights requested', {
        userId,
        timeRange,
        requestedBy: req.user.id
      });

      const insights = await analyticsService.generateUserInsights(userId, timeRange);

      res.json({
        success: true,
        data: insights,
        meta: {
          userId,
          timeRange,
          type: 'user_insights',
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('User insights generation failed', {
        error: error.message,
        userId: req.params.userId,
        requestedBy: req.user?.id
      });
      
      res.status(500).json({ 
        message: 'Failed to generate insights',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Get user comparison data
router.get('/compare/:userId', 
  auth, 
  validateUserId, 
  validateTimeRange, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { timeRange = '30d', metric = 'all' } = req.query;

      // Authorization check
      if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. You can only view your own comparison data.' 
        });
      }

      logger.info('User comparison requested', {
        userId,
        timeRange,
        metric,
        requestedBy: req.user.id
      });

      const comparison = await analyticsService.getUserComparison(userId, timeRange, metric);

      res.json({
        success: true,
        data: comparison,
        meta: {
          userId,
          timeRange,
          metric,
          type: 'user_comparison',
          generatedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('User comparison generation failed', {
        error: error.message,
        userId: req.params.userId,
        requestedBy: req.user?.id
      });
      
      res.status(500).json({ 
        message: 'Failed to generate comparison data',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Recalculate user analytics (admin only)
router.post('/recalculate/:userId', 
  auth, 
  validateUserId, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId } = req.params;

      // Admin only endpoint
      if (req.user.role !== 'admin') {
        logger.logSecurity('unauthorized_analytics_recalculation', {
          requestingUser: req.user.id,
          targetUser: userId,
          ip: req.ip
        });
        return res.status(403).json({ 
          message: 'Access denied. Admin privileges required.' 
        });
      }

      logger.info('Analytics recalculation requested', {
        userId,
        requestedBy: req.user.id
      });

      const result = await analyticsService.recalculateUserAnalytics(userId);

      res.json({
        success: true,
        message: 'Analytics recalculation completed',
        data: result,
        meta: {
          userId,
          requestedBy: req.user.id,
          completedAt: new Date()
        }
      });

    } catch (error) {
      logger.error('Analytics recalculation failed', {
        error: error.message,
        userId: req.params.userId,
        requestedBy: req.user?.id
      });
      
      res.status(500).json({ 
        message: 'Failed to recalculate analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Get analytics summary for multiple users (admin only)
router.get('/summary', 
  auth, 
  validateTimeRange, 
  handleValidationErrors,
  async (req, res) => {
    try {
      // Admin only endpoint
      if (req.user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. Admin privileges required.' 
        });
      }

      const { timeRange = '30d', limit = 50 } = req.query;

      logger.info('Analytics summary requested', {
        timeRange,
        limit,
        requestedBy: req.user.id
      });

      // Get top users by various metrics
      const summary = await Analytics.aggregate([
        {
          $match: {
            type: 'monthly', // Focus on monthly analytics
            'period.start': { 
              $gte: new Date(Date.now() - (timeRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000) 
            }
          }
        },
        {
          $group: {
            _id: '$userId',
            totalTasks: { $sum: '$metrics.tasksCompleted' },
            totalEarnings: { $sum: '$metrics.creditsEarned' },
            avgRating: { $avg: '$metrics.averageRating' },
            avgSuccessRate: { $avg: '$metrics.successRate' },
            lastUpdate: { $max: '$updatedAt' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            userId: '$_id',
            username: '$user.username',
            email: '$user.email',
            primaryRole: '$user.primaryRole',
            totalTasks: 1,
            totalEarnings: 1,
            avgRating: { $round: ['$avgRating', 2] },
            avgSuccessRate: { $round: ['$avgSuccessRate', 2] },
            lastUpdate: 1
          }
        },
        {
          $sort: { totalEarnings: -1 }
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      res.json({
        success: true,
        data: summary,
        meta: {
          timeRange,
          limit: parseInt(limit),
          type: 'analytics_summary',
          generatedAt: new Date(),
          count: summary.length
        }
      });

    } catch (error) {
      logger.error('Analytics summary generation failed', {
        error: error.message,
        requestedBy: req.user?.id
      });
      
      res.status(500).json({ 
        message: 'Failed to generate analytics summary',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
);

// Clear analytics cache
router.delete('/cache', auth, async (req, res) => {
  try {
    // Admin only or user can clear their own cache
    if (req.user.role !== 'admin' && !req.query.userId) {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required for global cache clear.' 
      });
    }

    const { userId } = req.query;

    if (userId && req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. You can only clear your own cache.' 
      });
    }

    logger.info('Analytics cache clear requested', {
      userId: userId || 'all',
      requestedBy: req.user.id
    });

    if (userId) {
      analyticsService.clearUserCache(userId);
    } else {
      analyticsService.clearAllCache();
    }

    res.json({
      success: true,
      message: userId ? 'User cache cleared' : 'All analytics cache cleared',
      meta: {
        userId: userId || 'all',
        clearedBy: req.user.id,
        clearedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Analytics cache clear failed', {
      error: error.message,
      requestedBy: req.user?.id
    });
    
    res.status(500).json({ 
      message: 'Failed to clear cache',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check for analytics service
router.get('/health', auth, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      service: 'analytics',
      timestamp: new Date(),
      checks: {
        database: 'unknown',
        cache: 'unknown',
        performance: 'unknown'
      }
    };

    // Test database connection
    try {
      await Analytics.findOne().lean().limit(1);
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Test cache functionality
    try {
      const testKey = 'health_check_test';
      await analyticsService.getCachedData?.(testKey);
      health.checks.cache = 'healthy';
    } catch (error) {
      health.checks.cache = 'unhealthy';
    }

    // Performance check
    const startTime = Date.now();
    try {
      await User.countDocuments();
      const duration = Date.now() - startTime;
      health.checks.performance = duration < 1000 ? 'healthy' : 'slow';
      health.responseTime = `${duration}ms`;
    } catch (error) {
      health.checks.performance = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Analytics health check failed', {
      error: error.message
    });
    
    res.status(503).json({
      status: 'unhealthy',
      service: 'analytics',
      timestamp: new Date(),
      error: 'Health check failed'
    });
  }
});

module.exports = router;