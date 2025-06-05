const Analytics = require('../models/Analytics');
const Task = require('../models/Task');
const Application = require('../models/Application');
const Booking = require('../models/Booking');
const User = require('../models/User');
const logger = require('../utils/logger');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Main method to get user analytics
  async getUserAnalytics(userId, timeRange = '7d', options = {}) {
    try {
      logger.info('Getting user analytics', { userId, timeRange, options });

      const cacheKey = `analytics_${userId}_${timeRange}_${JSON.stringify(options)}`;
      
      // Check cache first
      if (!options.forceRefresh && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          logger.debug('Returning cached analytics', { userId, timeRange });
          return cached.data;
        }
      }

      // Calculate date range
      const { startDate, endDate } = this.getDateRange(timeRange);

      // Get comprehensive analytics data
      const [
        basicMetrics,
        timelineData,
        performanceData,
        comparativeData,
        insights
      ] = await Promise.all([
        this.calculateBasicMetrics(userId, startDate, endDate),
        this.generateTimelineData(userId, startDate, endDate),
        this.calculatePerformanceMetrics(userId, startDate, endDate),
        this.getComparativeMetrics(userId, startDate, endDate),
        options.detailed ? this.generateInsights(userId, startDate, endDate) : null
      ]);

      const analytics = {
        userId,
        timeRange,
        period: { startDate, endDate },
        metrics: basicMetrics,
        timeline: timelineData,
        performance: performanceData,
        comparative: comparativeData,
        insights: insights || [],
        generatedAt: new Date(),
        earnings: await this.calculateEarningsData(userId, startDate, endDate)
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: analytics,
        timestamp: Date.now()
      });

      logger.info('Analytics calculated successfully', {
        userId,
        timeRange,
        metricsCount: Object.keys(basicMetrics).length,
        timelinePoints: timelineData.length
      });

      return analytics;

    } catch (error) {
      logger.error('Analytics calculation failed', {
        error: error.message,
        stack: error.stack,
        userId,
        timeRange
      });
      throw error;
    }
  }

  // Calculate basic user metrics
  async calculateBasicMetrics(userId, startDate, endDate) {
    try {
      logger.debug('Calculating basic metrics', { userId, startDate, endDate });

      const [
        user,
        tasks,
        applications,
        bookings,
        previousPeriodData
      ] = await Promise.all([
        User.findById(userId).lean(),
        Task.find({
          $or: [
            { taskProviderId: userId },
            { selectedHelper: userId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean(),
        Application.find({
          $or: [
            { applicantId: userId },
            { taskProviderId: userId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean(),
        Booking.find({
          $or: [
            { helper: userId },
            { taskProvider: userId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean(),
        this.getPreviousPeriodData(userId, startDate, endDate)
      ]);

      const helperTasks = tasks.filter(t => t.selectedHelper?.toString() === userId);
      const providerTasks = tasks.filter(t => t.taskProviderId.toString() === userId);
      const sentApplications = applications.filter(a => a.applicantId.toString() === userId);
      const receivedApplications = applications.filter(a => a.taskProviderId.toString() === userId);
      const helperBookings = bookings.filter(b => b.helper.toString() === userId);
      const providerBookings = bookings.filter(b => b.taskProvider.toString() === userId);

      const completedHelperTasks = helperTasks.filter(t => t.status === 'completed').length;
      const completedProviderTasks = providerTasks.filter(t => t.status === 'completed').length;
      const acceptedApplications = sentApplications.filter(a => a.status === 'accepted').length;
      const completedBookings = bookings.filter(b => b.status === 'completed').length;

      const totalCreditsEarned = helperBookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.agreedCredits || 0), 0);

      const totalCreditsSpent = providerBookings
        .filter(b => b.status === 'completed')
        .reduce((sum, b) => sum + (b.agreedCredits || 0), 0);

      const metrics = {
        // Current state
        credits: user.credits,
        rating: user.rating || 0,
        totalRatings: user.totalRatings || 0,
        completedTasks: user.completedTasks || 0,

        // Period-specific metrics
        tasksCreated: providerTasks.length,
        tasksCompleted: completedHelperTasks,
        applicationsSubmitted: sentApplications.length,
        applicationsReceived: receivedApplications.length,
        applicationsAccepted: acceptedApplications,
        
        // Financial metrics
        creditsEarned: totalCreditsEarned,
        creditsSpent: totalCreditsSpent,
        netCredits: totalCreditsEarned - totalCreditsSpent,
        
        // Performance metrics
        applicationSuccessRate: sentApplications.length > 0 
          ? Math.round((acceptedApplications / sentApplications.length) * 100) 
          : 0,
        taskCompletionRate: helperTasks.length > 0 
          ? Math.round((completedHelperTasks / helperTasks.length) * 100) 
          : 0,
        averageTaskValue: completedBookings.length > 0 
          ? Math.round(totalCreditsEarned / completedBookings.length) 
          : 0,

        // Activity metrics
        activeBookings: bookings.filter(b => ['confirmed', 'in-progress', 'work-submitted'].includes(b.status)).length,
        pendingApplications: sentApplications.filter(a => a.status === 'pending').length,

        // Changes from previous period
        creditsChange: this.calculateChange(totalCreditsEarned, previousPeriodData.creditsEarned),
        ratingChange: this.calculateChange(user.rating, previousPeriodData.rating),
        completedTasksChange: this.calculateChange(completedHelperTasks, previousPeriodData.completedTasks),
        applicationsSubmittedChange: this.calculateChange(sentApplications.length, previousPeriodData.applicationsSubmitted),
        successRateChange: this.calculateChange(
          sentApplications.length > 0 ? (acceptedApplications / sentApplications.length) * 100 : 0,
          previousPeriodData.successRate
        )
      };

      logger.debug('Basic metrics calculated', {
        userId,
        metricsCount: Object.keys(metrics).length,
        creditsEarned: totalCreditsEarned,
        tasksCompleted: completedHelperTasks
      });

      return metrics;

    } catch (error) {
      logger.error('Basic metrics calculation failed', {
        error: error.message,
        userId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  // Generate timeline data for charts
  async generateTimelineData(userId, startDate, endDate) {
    try {
      logger.debug('Generating timeline data', { userId, startDate, endDate });

      const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const timeline = [];

      // Generate daily data points
      for (let i = 0; i < daysDiff; i++) {
        const currentDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        const nextDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

        const [
          dayTasks,
          dayApplications,
          dayBookings
        ] = await Promise.all([
          Task.find({
            $or: [
              { taskProviderId: userId },
              { selectedHelper: userId }
            ],
            createdAt: { $gte: currentDate, $lt: nextDate }
          }).lean(),
          Application.find({
            applicantId: userId,
            createdAt: { $gte: currentDate, $lt: nextDate }
          }).lean(),
          Booking.find({
            $or: [
              { helper: userId },
              { taskProvider: userId }
            ],
            createdAt: { $gte: currentDate, $lt: nextDate }
          }).lean()
        ]);

        const completedTasks = dayTasks.filter(t => t.status === 'completed' && t.selectedHelper?.toString() === userId).length;
        const acceptedApplications = dayApplications.filter(a => a.status === 'accepted').length;
        const dayEarnings = dayBookings
          .filter(b => b.helper.toString() === userId && b.status === 'completed')
          .reduce((sum, b) => sum + (b.agreedCredits || 0), 0);

        timeline.push({
          date: currentDate.toISOString().split('T')[0],
          completedTasks,
          applications: dayApplications.length,
          earnings: dayEarnings,
          credits: dayEarnings, // Same as earnings for helpers
          rating: dayTasks.length > 0 ? Math.random() * 0.5 + 4.5 : 0, // Placeholder - should calculate actual
          successRate: dayApplications.length > 0 
            ? Math.round((acceptedApplications / dayApplications.length) * 100) 
            : 0,
          tasks: dayTasks.filter(t => t.taskProviderId.toString() === userId).length
        });
      }

      logger.debug('Timeline data generated', {
        userId,
        timelinePoints: timeline.length,
        totalDays: daysDiff
      });

      return timeline;

    } catch (error) {
      logger.error('Timeline generation failed', {
        error: error.message,
        userId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  // Calculate earnings-specific data
  async calculateEarningsData(userId, startDate, endDate) {
    try {
      logger.debug('Calculating earnings data', { userId, startDate, endDate });

      const bookings = await Booking.find({
        helper: userId,
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate }
      }).populate('taskId', 'title skillsRequired').lean();

      const earningsData = {
        total: bookings.reduce((sum, b) => sum + (b.agreedCredits || 0), 0),
        average: bookings.length > 0 ? bookings.reduce((sum, b) => sum + (b.agreedCredits || 0), 0) / bookings.length : 0,
        byCategory: {},
        byTimeframe: {},
        transactions: bookings.map(b => ({
          date: b.completedAt,
          amount: b.agreedCredits,
          taskTitle: b.taskId?.title || 'Unknown Task',
          skills: b.taskId?.skillsRequired || []
        }))
      };

      // Group by skill category
      bookings.forEach(booking => {
        const skills = booking.taskId?.skillsRequired || ['Other'];
        skills.forEach(skill => {
          earningsData.byCategory[skill] = (earningsData.byCategory[skill] || 0) + booking.agreedCredits;
        });
      });

      logger.debug('Earnings data calculated', {
        userId,
        total: earningsData.total,
        transactions: earningsData.transactions.length
      });

      return earningsData;

    } catch (error) {
      logger.error('Earnings calculation failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Calculate performance metrics
  async calculatePerformanceMetrics(userId, startDate, endDate) {
    try {
      logger.debug('Calculating performance metrics', { userId, startDate, endDate });

      const user = await User.findById(userId).lean();
      const applications = await Application.find({
        applicantId: userId,
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      const acceptedApplications = applications.filter(a => a.status === 'accepted').length;
      const responseTime = await this.calculateAverageResponseTime(userId, startDate, endDate);

      const performance = {
        overallScore: this.calculatePerformanceScore(user, applications),
        rating: user.rating || 0,
        successRate: applications.length > 0 ? (acceptedApplications / applications.length) * 100 : 0,
        responseTime: responseTime, // in hours
        consistency: this.calculateConsistencyScore(user),
        growth: await this.calculateGrowthRate(userId, startDate, endDate),
        timeline: await this.generatePerformanceTimeline(userId, startDate, endDate)
      };

      logger.debug('Performance metrics calculated', {
        userId,
        overallScore: performance.overallScore,
        successRate: performance.successRate
      });

      return performance;

    } catch (error) {
      logger.error('Performance metrics calculation failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Get platform benchmarks for comparison
  async getPlatformBenchmarks(timeRange = '7d') {
    try {
      const cacheKey = `platform_benchmarks_${timeRange}`;
      
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry * 2) { // Cache longer for platform data
          return cached.data;
        }
      }

      const { startDate, endDate } = this.getDateRange(timeRange);

      const [
        userStats,
        applicationStats,
        bookingStats
      ] = await Promise.all([
        User.aggregate([
          {
            $group: {
              _id: null,
              avgRating: { $avg: '$rating' },
              avgCompletedTasks: { $avg: '$completedTasks' },
              totalUsers: { $sum: 1 }
            }
          }
        ]),
        Application.aggregate([
          {
            $match: {
              createdAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: null,
              totalApplications: { $sum: 1 },
              acceptedApplications: {
                $sum: { $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0] }
              }
            }
          }
        ]),
        Booking.aggregate([
          {
            $match: {
              status: 'completed',
              completedAt: { $gte: startDate, $lte: endDate }
            }
          },
          {
            $group: {
              _id: null,
              avgCredits: { $avg: '$agreedCredits' },
              totalBookings: { $sum: 1 }
            }
          }
        ])
      ]);

      const benchmarks = {
        avgRating: userStats[0]?.avgRating || 0,
        avgSuccessRate: applicationStats[0] 
          ? (applicationStats[0].acceptedApplications / applicationStats[0].totalApplications) * 100 
          : 0,
        avgTaskValue: bookingStats[0]?.avgCredits || 0,
        totalUsers: userStats[0]?.totalUsers || 0,
        totalApplications: applicationStats[0]?.totalApplications || 0,
        totalBookings: bookingStats[0]?.totalBookings || 0
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: benchmarks,
        timestamp: Date.now()
      });

      logger.debug('Platform benchmarks calculated', benchmarks);

      return benchmarks;

    } catch (error) {
      logger.error('Platform benchmarks calculation failed', {
        error: error.message,
        timeRange
      });
      throw error;
    }
  }

  // Generate user insights and recommendations
  async generateUserInsights(userId, timeRange = '30d') {
    try {
      logger.debug('Generating user insights', { userId, timeRange });

      const { startDate, endDate } = this.getDateRange(timeRange);
      const [analytics, benchmarks] = await Promise.all([
        this.getUserAnalytics(userId, timeRange),
        this.getPlatformBenchmarks(timeRange)
      ]);

      const insights = [];

      // Success rate insights
      if (analytics.metrics.applicationSuccessRate < benchmarks.avgSuccessRate) {
        insights.push({
          type: 'improvement',
          title: 'Improve Application Success Rate',
          description: `Your success rate (${analytics.metrics.applicationSuccessRate}%) is below platform average (${benchmarks.avgSuccessRate.toFixed(1)}%)`,
          impact: 'high',
          actionRequired: true,
          metadata: {
            currentRate: analytics.metrics.applicationSuccessRate,
            benchmarkRate: benchmarks.avgSuccessRate,
            suggestions: [
              'Customize application messages for each task',
              'Highlight relevant experience and skills',
              'Apply to tasks that match your expertise closely'
            ]
          }
        });
      }

      // Rating insights
      if (analytics.metrics.rating > benchmarks.avgRating) {
        insights.push({
          type: 'achievement',
          title: 'Excellent Rating Performance',
          description: `Your rating (${analytics.metrics.rating.toFixed(1)}) is above platform average (${benchmarks.avgRating.toFixed(1)})`,
          impact: 'medium',
          actionRequired: false,
          metadata: {
            currentRating: analytics.metrics.rating,
            benchmarkRating: benchmarks.avgRating
          }
        });
      }

      // Activity insights
      if (analytics.metrics.applicationsSubmitted === 0 && timeRange === '7d') {
        insights.push({
          type: 'recommendation',
          title: 'Increase Activity',
          description: 'You haven\'t submitted any applications this week. Consider browsing available tasks.',
          impact: 'medium',
          actionRequired: true,
          metadata: {
            suggestedActions: [
              'Browse tasks matching your skills',
              'Set up task alerts for relevant categories',
              'Update your profile to attract task providers'
            ]
          }
        });
      }

      // Earnings trend
      const earningsTrend = this.calculateTrend(analytics.timeline.map(t => t.earnings));
      if (earningsTrend === 'declining') {
        insights.push({
          type: 'warning',
          title: 'Declining Earnings Trend',
          description: 'Your earnings have been declining over the selected period.',
          impact: 'high',
          actionRequired: true,
          metadata: {
            trend: earningsTrend,
            suggestions: [
              'Focus on higher-value tasks',
              'Improve skills in high-demand areas',
              'Optimize application timing and quality'
            ]
          }
        });
      }

      logger.info('User insights generated', {
        userId,
        insightsCount: insights.length,
        actionRequired: insights.filter(i => i.actionRequired).length
      });

      return insights;

    } catch (error) {
      logger.error('Insights generation failed', {
        error: error.message,
        userId,
        timeRange
      });
      throw error;
    }
  }

  // Helper method to get date range
  getDateRange(timeRange) {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  // Calculate change percentage
  calculateChange(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  // Calculate performance score
  calculatePerformanceScore(user, applications) {
    const weights = {
      rating: 0.3,
      successRate: 0.25,
      experience: 0.2,
      consistency: 0.15,
      activity: 0.1
    };

    const rating = (user.rating || 0) / 5;
    const successRate = applications.length > 0 
      ? applications.filter(a => a.status === 'accepted').length / applications.length 
      : 0;
    const experience = Math.min((user.completedTasks || 0) / 50, 1);
    const consistency = Math.min((user.totalRatings || 0) / 20, 1);
    const activity = Math.min(applications.length / 10, 1);

    return Math.round((
      rating * weights.rating +
      successRate * weights.successRate +
      experience * weights.experience +
      consistency * weights.consistency +
      activity * weights.activity
    ) * 100);
  }

  // Calculate consistency score
  calculateConsistencyScore(user) {
    // This is a simplified calculation
    // In reality, you'd want to analyze rating variance over time
    const baseScore = user.totalRatings || 0;
    const ratingQuality = user.rating || 0;
    
    return Math.min((baseScore * ratingQuality) / 25, 100);
  }

  // Calculate trend direction
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length;
    
    if (secondAvg > firstAvg * 1.1) return 'increasing';
    if (secondAvg < firstAvg * 0.9) return 'declining';
    return 'stable';
  }

  // Calculate average response time (placeholder implementation)
  async calculateAverageResponseTime(userId, startDate, endDate) {
    // This would calculate actual response times from chat/application data
    // For now, return a placeholder value
    return Math.random() * 24; // Random hours between 0-24
  }

  // Calculate growth rate
  async calculateGrowthRate(userId, startDate, endDate) {
    // Simplified growth calculation
    // In practice, you'd want to compare with previous periods
    return Math.random() * 20 - 10; // Random growth between -10% and +10%
  }

  // Generate performance timeline
  async generatePerformanceTimeline(userId, startDate, endDate) {
    // This would generate daily performance scores
    // For now, return a simplified timeline
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const timeline = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      timeline.push({
        date: date.toISOString().split('T')[0],
        score: Math.random() * 30 + 70 // Random score between 70-100
      });
    }
    
    return timeline;
  }

  // Get previous period data for comparison
  async getPreviousPeriodData(userId, startDate, endDate) {
    const periodLength = endDate - startDate;
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate);

    try {
      const prevMetrics = await this.calculateBasicMetrics(userId, prevStartDate, prevEndDate);
      return prevMetrics;
    } catch (error) {
      logger.warn('Could not calculate previous period data', {
        error: error.message,
        userId
      });
      return {};
    }
  }

  // Clear cache for specific user
  clearUserCache(userId) {
    const keysToDelete = [];
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    
    logger.debug('User cache cleared', { userId, keysCleared: keysToDelete.length });
  }

  // Clear all cache
  clearAllCache() {
    this.cache.clear();
    logger.info('All analytics cache cleared');
  }
}

module.exports = new AnalyticsService();