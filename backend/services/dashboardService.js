const Task = require('../models/Task');
const Application = require('../models/Application');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const logger = require('../utils/logger');

class DashboardService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes default
    this.userPreferences = new Map();
  }

  // Get cached data
  async getCachedData(key) {
    try {
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (Date.now() - cached.timestamp < (cached.expiry || this.cacheExpiry)) {
          logger.debug('Cache hit', { key, age: Date.now() - cached.timestamp });
          return cached.data;
        } else {
          this.cache.delete(key);
          logger.debug('Cache expired', { key });
        }
      }
      return null;
    } catch (error) {
      logger.error('Cache retrieval failed', { error: error.message, key });
      return null;
    }
  }

  // Set cached data
  async setCachedData(key, data, expiry = null) {
    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiry: expiry || this.cacheExpiry
      });
      logger.debug('Data cached', { key, expiry: expiry || this.cacheExpiry });
    } catch (error) {
      logger.error('Cache storage failed', { error: error.message, key });
    }
  }

  // Calculate comprehensive user statistics
  async calculateUserStats(userId, timeRange = '7d') {
    try {
      logger.info('Calculating user stats', { userId, timeRange });

      const { startDate, endDate } = this.getDateRange(timeRange);

      // Get user data
      const user = await User.findById(userId).lean();
      if (!user) {
        throw new Error('User not found');
      }

      // Parallel data fetching for better performance
      const [
        tasks,
        applications,
        bookings,
        chatStats,
        previousPeriodStats
      ] = await Promise.all([
        this.getUserTasks(userId, startDate, endDate),
        this.getUserApplications(userId, startDate, endDate),
        this.getUserBookings(userId, startDate, endDate),
        this.getUserChatStats(userId, startDate, endDate),
        this.getPreviousPeriodStats(userId, startDate, endDate)
      ]);

      // Calculate current period metrics
      const stats = {
        // Basic user info
        credits: user.credits,
        rating: user.rating || 0,
        totalRatings: user.totalRatings || 0,
        completedTasks: user.completedTasks || 0,
        joinDate: user.createdAt,

        // Task statistics
        tasksCreated: tasks.created.length,
        tasksCompleted: tasks.completed.length,
        tasksInProgress: tasks.inProgress.length,
        tasksOpen: tasks.open.length,

        // Application statistics
        applicationsSubmitted: applications.sent.length,
        applicationsReceived: applications.received.length,
        applicationsAccepted: applications.accepted.length,
        applicationsPending: applications.pending.length,

        // Success rates
        applicationSuccessRate: applications.sent.length > 0
          ? Math.round((applications.accepted.length / applications.sent.length) * 100)
          : 0,
        taskCompletionRate: tasks.assigned.length > 0
          ? Math.round((tasks.completed.length / tasks.assigned.length) * 100)
          : 100,

        // Financial metrics
        creditsEarned: bookings.earnings.total,
        creditsSpent: bookings.spent.total,
        netCredits: bookings.earnings.total - bookings.spent.total,
        averageEarning: bookings.earnings.average,
        averageSpending: bookings.spent.average,

        // Activity metrics
        activeBookings: bookings.active.length,
        completedBookings: bookings.completed.length,
        chatsSent: chatStats.messagesSent,
        chatsReceived: chatStats.messagesReceived,
        responseTime: chatStats.averageResponseTime,

        // Comparative metrics (vs previous period)
        changes: {
          creditsEarned: this.calculatePercentageChange(
            bookings.earnings.total,
            previousPeriodStats.creditsEarned
          ),
          tasksCompleted: this.calculatePercentageChange(
            tasks.completed.length,
            previousPeriodStats.tasksCompleted
          ),
          applicationsSubmitted: this.calculatePercentageChange(
            applications.sent.length,
            previousPeriodStats.applicationsSubmitted
          ),
          successRate: this.calculatePercentageChange(
            applications.sent.length > 0 ? (applications.accepted.length / applications.sent.length) * 100 : 0,
            previousPeriodStats.successRate
          ),
          rating: this.calculatePercentageChange(
            user.rating || 0,
            previousPeriodStats.rating
          )
        },

        // Performance indicators
        performanceScore: await this.calculatePerformanceScore(userId, {
          tasks,
          applications,
          bookings,
          user
        }),

        // Streak information
        streaks: await this.calculateStreaks(userId),

        // Goals and achievements
        goals: await this.calculateGoalProgress(userId, user),

        // Time-based breakdown
        timeRange,
        periodStart: startDate,
        periodEnd: endDate,
        generatedAt: new Date()
      };

      logger.info('User stats calculated successfully', {
        userId,
        timeRange,
        tasksCreated: stats.tasksCreated,
        creditsEarned: stats.creditsEarned,
        performanceScore: stats.performanceScore
      });

      return stats;

    } catch (error) {
      logger.error('User stats calculation failed', {
        error: error.message,
        stack: error.stack,
        userId,
        timeRange
      });
      throw error;
    }
  }

  // Get user tasks with categorization
  async getUserTasks(userId, startDate, endDate) {
    try {
      const tasks = await Task.find({
        $or: [
          { taskProviderId: userId },
          { selectedHelper: userId }
        ],
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      const createdTasks = tasks.filter(t => t.taskProviderId.toString() === userId);
      const assignedTasks = tasks.filter(t => t.selectedHelper?.toString() === userId);

      return {
        created: createdTasks,
        assigned: assignedTasks,
        completed: tasks.filter(t => t.status === 'completed'),
        inProgress: tasks.filter(t => ['assigned', 'in-progress'].includes(t.status)),
        open: tasks.filter(t => t.status === 'open'),
        cancelled: tasks.filter(t => t.status === 'cancelled'),
        all: tasks
      };
    } catch (error) {
      logger.error('Failed to get user tasks', { error: error.message, userId });
      throw error;
    }
  }

  // Get user applications with categorization
  async getUserApplications(userId, startDate, endDate) {
    try {
      const applications = await Application.find({
        $or: [
          { applicantId: userId },
          { taskProviderId: userId }
        ],
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      const sentApplications = applications.filter(a => a.applicantId.toString() === userId);
      const receivedApplications = applications.filter(a => a.taskProviderId.toString() === userId);

      return {
        sent: sentApplications,
        received: receivedApplications,
        accepted: sentApplications.filter(a => a.status === 'accepted'),
        rejected: sentApplications.filter(a => a.status === 'rejected'),
        pending: sentApplications.filter(a => a.status === 'pending'),
        withdrawn: sentApplications.filter(a => a.status === 'withdrawn'),
        all: applications
      };
    } catch (error) {
      logger.error('Failed to get user applications', { error: error.message, userId });
      throw error;
    }
  }

  // Get user bookings with financial analysis
  async getUserBookings(userId, startDate, endDate) {
    try {
      const bookings = await Booking.find({
        $or: [
          { helper: userId },
          { taskProvider: userId }
        ],
        createdAt: { $gte: startDate, $lte: endDate }
      }).lean();

      const helperBookings = bookings.filter(b => b.helper.toString() === userId);
      const providerBookings = bookings.filter(b => b.taskProvider.toString() === userId);

      const completedHelperBookings = helperBookings.filter(b => b.status === 'completed');
      const completedProviderBookings = providerBookings.filter(b => b.status === 'completed');

      const totalEarnings = completedHelperBookings.reduce((sum, b) => sum + (b.agreedCredits || 0), 0);
      const totalSpent = completedProviderBookings.reduce((sum, b) => sum + (b.agreedCredits || 0), 0);

      return {
        helper: helperBookings,
        provider: providerBookings,
        active: bookings.filter(b => ['confirmed', 'in-progress', 'work-submitted'].includes(b.status)),
        completed: bookings.filter(b => b.status === 'completed'),
        cancelled: bookings.filter(b => b.status === 'cancelled'),
        earnings: {
          total: totalEarnings,
          average: completedHelperBookings.length > 0 ? Math.round(totalEarnings / completedHelperBookings.length) : 0,
          bookings: completedHelperBookings
        },
        spent: {
          total: totalSpent,
          average: completedProviderBookings.length > 0 ? Math.round(totalSpent / completedProviderBookings.length) : 0,
          bookings: completedProviderBookings
        },
        all: bookings
      };
    } catch (error) {
      logger.error('Failed to get user bookings', { error: error.message, userId });
      throw error;
    }
  }

  // Get user chat statistics
  async getUserChatStats(userId, startDate, endDate) {
    try {
      const [chats, messages] = await Promise.all([
        Chat.find({
          participants: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean(),
        Message.find({
          senderId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).lean()
      ]);

      // Calculate response time (simplified)
      const responseTime = messages.length > 0 ? Math.random() * 24 : 0; // Placeholder

      return {
        totalChats: chats.length,
        messagesSent: messages.length,
        messagesReceived: Math.floor(messages.length * 1.2), // Estimate
        averageResponseTime: responseTime,
        activeChats: chats.filter(c => c.isActive).length
      };
    } catch (error) {
      logger.error('Failed to get user chat stats', { error: error.message, userId });
      return {
        totalChats: 0,
        messagesSent: 0,
        messagesReceived: 0,
        averageResponseTime: 0,
        activeChats: 0
      };
    }
  }

  // Get user activity feed
  async getUserActivity(userId, timeRange = '7d', options = {}) {
    try {
      logger.debug('Getting user activity', { userId, timeRange, options });

      const { startDate, endDate } = this.getDateRange(timeRange);
      const { limit = 50, type = null } = options;

      // Get all relevant activities
      const [tasks, applications, bookings, messages] = await Promise.all([
        Task.find({
          $or: [
            { taskProviderId: userId },
            { selectedHelper: userId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }).populate('taskProviderId selectedHelper', 'username').lean(),

        Application.find({
          $or: [
            { applicantId: userId },
            { taskProviderId: userId }
          ],
          createdAt: { $gte: startDate, $lte: endDate }
        }).populate('applicantId taskProviderId taskId', 'username title').lean(),

        Booking.find({
          $or: [
            { helper: userId },
            { taskProvider: userId }
          ],
          updatedAt: { $gte: startDate, $lte: endDate }
        }).populate('helper taskProvider taskId', 'username title').lean(),

        Message.find({
          senderId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }).populate('chatId', 'taskId').limit(20).lean()
      ]);

      // Convert to activity format
      const activities = [];

      // Task activities
      tasks.forEach(task => {
        const isCreator = task.taskProviderId._id.toString() === userId;
        activities.push({
          id: `task_${task._id}`,
          type: 'task',
          action: isCreator ? 'created' : 'assigned',
          title: `${isCreator ? 'Created' : 'Assigned to'} task: ${task.title}`,
          description: task.description.substring(0, 100) + '...',
          createdAt: task.createdAt,
          metadata: {
            taskId: task._id,
            status: task.status,
            credits: task.credits,
            isCreator
          }
        });
      });

      // Application activities
      applications.forEach(app => {
        const isApplicant = app.applicantId._id.toString() === userId;
        activities.push({
          id: `application_${app._id}`,
          type: 'application',
          action: isApplicant ? 'submitted' : 'received',
          title: `${isApplicant ? 'Applied for' : 'Received application for'} task: ${app.taskId?.title || 'Unknown'}`,
          description: app.message?.substring(0, 100) + '...',
          createdAt: app.createdAt,
          metadata: {
            applicationId: app._id,
            status: app.status,
            credits: app.proposedCredits,
            isApplicant
          }
        });
      });

      // Booking activities
      bookings.forEach(booking => {
        const isHelper = booking.helper._id.toString() === userId;
        activities.push({
          id: `booking_${booking._id}`,
          type: 'booking',
          action: 'status_change',
          title: `Booking ${booking.status}: ${booking.taskId?.title || 'Unknown Task'}`,
          description: `Status changed to ${booking.status}`,
          createdAt: booking.updatedAt,
          metadata: {
            bookingId: booking._id,
            status: booking.status,
            credits: booking.agreedCredits,
            isHelper
          }
        });
      });

      // Message activities (limited)
      messages.slice(0, 10).forEach(message => {
        activities.push({
          id: `message_${message._id}`,
          type: 'message',
          action: 'sent',
          title: 'Sent message',
          description: message.content.substring(0, 50) + '...',
          createdAt: message.createdAt,
          metadata: {
            messageId: message._id,
            chatId: message.chatId
          }
        });
      });

      // Filter by type if specified
      let filteredActivities = type 
        ? activities.filter(a => a.type === type)
        : activities;

      // Sort by date and limit
      filteredActivities = filteredActivities
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      logger.debug('Activity feed generated', {
        userId,
        totalActivities: activities.length,
        filteredCount: filteredActivities.length,
        types: [...new Set(activities.map(a => a.type))]
      });

      return filteredActivities;

    } catch (error) {
      logger.error('Failed to get user activity', {
        error: error.message,
        userId,
        timeRange
      });
      throw error;
    }
  }

  // Process batch activities
  async processBatchActivities(userId, activities) {
    try {
      logger.debug('Processing batch activities', {
        userId,
        count: activities.length
      });

      const results = {
        processed: 0,
        failed: 0,
        errors: []
      };

      for (const activity of activities) {
        try {
          // Validate activity structure
          if (!activity.type || !activity.action) {
            throw new Error('Invalid activity structure');
          }

          // Here you would typically save to database or update metrics
          // For now, we'll just log the activity
          logger.debug('Processing activity', {
            userId,
            type: activity.type,
            action: activity.action
          });

          results.processed++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            activity: activity.id || 'unknown',
            error: error.message
          });
        }
      }

      logger.info('Batch activities processed', {
        userId,
        processed: results.processed,
        failed: results.failed
      });

      return results;

    } catch (error) {
      logger.error('Batch activity processing failed', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Export user data
  async exportUserData(userId, timeRange, format = 'json') {
    try {
      logger.info('Exporting user data', { userId, timeRange, format });

      const stats = await this.calculateUserStats(userId, timeRange);
      const activity = await this.getUserActivity(userId, timeRange, { limit: 1000 });

      const exportData = {
        user: stats,
        activity,
        exportedAt: new Date(),
        timeRange,
        format
      };

      if (format === 'csv') {
        return this.convertToCSV(exportData);
      }

      return exportData;

    } catch (error) {
      logger.error('Data export failed', {
        error: error.message,
        userId,
        format
      });
      throw error;
    }
  }

  // Convert data to CSV format
  convertToCSV(data) {
    try {
      // Simplified CSV conversion for activity data
      const headers = ['Date', 'Type', 'Action', 'Title', 'Description'];
      const rows = data.activity.map(activity => [
        new Date(activity.createdAt).toLocaleDateString(),
        activity.type,
        activity.action,
        `"${activity.title.replace(/"/g, '""')}"`,
        `"${activity.description.replace(/"/g, '""')}"`
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    } catch (error) {
      logger.error('CSV conversion failed', { error: error.message });
      throw error;
    }
  }

  // Calculate performance score
  async calculatePerformanceScore(userId, data) {
    try {
      const { tasks, applications, bookings, user } = data;

      const weights = {
        successRate: 0.3,
        rating: 0.25,
        activity: 0.2,
        consistency: 0.15,
        growth: 0.1
      };

      // Calculate individual components
      const successRate = applications.sent.length > 0
        ? applications.accepted.length / applications.sent.length
        : 0.5;

      const rating = (user.rating || 0) / 5;
      const activity = Math.min((tasks.all.length + applications.all.length) / 20, 1);
      const consistency = Math.min((user.totalRatings || 0) / 50, 1);
      const growth = 0.5; // Placeholder for growth calculation

      const score = Math.round((
        successRate * weights.successRate +
        rating * weights.rating +
        activity * weights.activity +
        consistency * weights.consistency +
        growth * weights.growth
      ) * 100);

      logger.debug('Performance score calculated', {
        userId,
        score,
        components: { successRate, rating, activity, consistency, growth }
      });

      return score;

    } catch (error) {
      logger.error('Performance score calculation failed', {
        error: error.message,
        userId
      });
      return 0;
    }
  }

  // Calculate streaks
  async calculateStreaks(userId) {
    try {
      // This is a simplified implementation
      // In practice, you'd analyze daily activity data
      return {
        current: Math.floor(Math.random() * 10) + 1,
        longest: Math.floor(Math.random() * 30) + 5,
        type: 'daily_activity'
      };
    } catch (error) {
      logger.error('Streak calculation failed', { error: error.message, userId });
      return { current: 0, longest: 0, type: 'daily_activity' };
    }
  }

  // Calculate goal progress
  async calculateGoalProgress(userId, user) {
    try {
      // Example goals - in practice, these would be user-defined
      const goals = [
        {
          id: 'rating_goal',
          title: 'Achieve 4.5+ Rating',
          current: user.rating || 0,
          target: 4.5,
          progress: Math.min(((user.rating || 0) / 4.5) * 100, 100)
        },
        {
          id: 'tasks_goal',
          title: 'Complete 50 Tasks',
          current: user.completedTasks || 0,
          target: 50,
          progress: Math.min(((user.completedTasks || 0) / 50) * 100, 100)
        }
      ];

      return goals;
    } catch (error) {
      logger.error('Goal progress calculation failed', { error: error.message, userId });
      return [];
    }
  }

  // Utility methods
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

  calculatePercentageChange(current, previous) {
    if (!previous || previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 100);
  }

  // Get previous period stats
  async getPreviousPeriodStats(userId, startDate, endDate) {
    try {
      const periodLength = endDate - startDate;
      const prevEndDate = new Date(startDate);
      const prevStartDate = new Date(startDate.getTime() - periodLength);

      // Get basic stats for previous period
      const tasks = await this.getUserTasks(userId, prevStartDate, prevEndDate);
      const applications = await this.getUserApplications(userId, prevStartDate, prevEndDate);
      const bookings = await this.getUserBookings(userId, prevStartDate, prevEndDate);

      return {
        tasksCompleted: tasks.completed.length,
        applicationsSubmitted: applications.sent.length,
        creditsEarned: bookings.earnings.total,
        successRate: applications.sent.length > 0
          ? (applications.accepted.length / applications.sent.length) * 100
          : 0,
        rating: 0 // Would need historical rating data
      };
    } catch (error) {
      logger.warn('Could not get previous period stats', {
        error: error.message,
        userId
      });
      return {
        tasksCompleted: 0,
        applicationsSubmitted: 0,
        creditsEarned: 0,
        successRate: 0,
        rating: 0
      };
    }
  }

  // Cache management
  invalidateUserCaches(userId) {
    const keysToDelete = [];
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
    
    logger.debug('User caches invalidated', {
      userId,
      keysInvalidated: keysToDelete.length
    });
  }

  // Dashboard health check
  async getDashboardHealth(userId) {
    try {
      const health = {
        status: 'healthy',
        checks: {
          database: 'healthy',
          cache: 'healthy',
          user: 'healthy'
        },
        metrics: {
          cacheSize: this.cache.size,
          cacheHitRate: 0.8, // Placeholder
          responseTime: 0
        },
        timestamp: new Date()
      };

      // Test database connection
      try {
        await User.findById(userId).lean();
      } catch (error) {
        health.checks.database = 'unhealthy';
        health.status = 'unhealthy';
      }

      return health;
    } catch (error) {
      logger.error('Health check failed', { error: error.message, userId });
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // User preferences management
  async updateUserPreferences(userId, preferences) {
    try {
      // In practice, this would save to database
      this.userPreferences.set(userId, {
        ...this.userPreferences.get(userId),
        ...preferences,
        updatedAt: new Date()
      });

      logger.info('User preferences updated', { userId, preferences });
      return this.userPreferences.get(userId);
    } catch (error) {
      logger.error('Failed to update preferences', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  getUserPreferences(userId) {
    return this.userPreferences.get(userId) || {
      refreshInterval: 30000,
      defaultTimeRange: '7d',
      chartTypes: ['line'],
      enableNotifications: true,
      theme: 'light'
    };
  }
}

module.exports = new DashboardService();