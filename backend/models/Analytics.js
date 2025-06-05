const mongoose = require('mongoose');

const AnalyticsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    required: true
  },
  period: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    }
  },
  metrics: {
    // User activity metrics
    tasksCompleted: {
      type: Number,
      default: 0
    },
    tasksCreated: {
      type: Number,
      default: 0
    },
    applicationsSubmitted: {
      type: Number,
      default: 0
    },
    applicationsReceived: {
      type: Number,
      default: 0
    },
    applicationsAccepted: {
      type: Number,
      default: 0
    },
    
    // Financial metrics
    creditsEarned: {
      type: Number,
      default: 0
    },
    creditsSpent: {
      type: Number,
      default: 0
    },
    creditsBalance: {
      type: Number,
      default: 0
    },
    averageTaskValue: {
      type: Number,
      default: 0
    },
    
    // Performance metrics
    averageRating: {
      type: Number,
      default: 0
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    successRate: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    responseTime: {
      type: Number, // Average response time in hours
      default: 0
    },
    
    // Engagement metrics
    chatMessages: {
      type: Number,
      default: 0
    },
    profileViews: {
      type: Number,
      default: 0
    },
    loginCount: {
      type: Number,
      default: 0
    },
    timeSpent: {
      type: Number, // Total time spent in minutes
      default: 0
    },
    
    // Task-specific metrics
    tasksByCategory: [{
      category: String,
      count: Number
    }],
    tasksByDuration: [{
      duration: String,
      count: Number
    }],
    tasksByUrgency: [{
      urgency: String,
      count: Number
    }],
    
    // Growth metrics
    weekOverWeekGrowth: {
      type: Number,
      default: 0
    },
    monthOverMonthGrowth: {
      type: Number,
      default: 0
    }
  },
  
  // Detailed timeline data for charts
  timeline: [{
    date: {
      type: Date,
      required: true
    },
    dailyMetrics: {
      tasksCompleted: { type: Number, default: 0 },
      creditsEarned: { type: Number, default: 0 },
      creditsSpent: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      successRate: { type: Number, default: 0 },
      activeTime: { type: Number, default: 0 } // minutes
    }
  }],
  
  // Performance insights
  insights: [{
    type: {
      type: String,
      enum: ['improvement', 'achievement', 'recommendation', 'warning']
    },
    title: String,
    description: String,
    impact: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    actionRequired: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  
  // Comparative analytics
  benchmarks: {
    platformAverage: {
      successRate: Number,
      averageRating: Number,
      responseTime: Number,
      taskCompletion: Number
    },
    userPercentile: {
      successRate: Number,
      rating: Number,
      activity: Number,
      earnings: Number
    },
    roleSpecific: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Prediction models
  predictions: {
    nextWeekEarnings: Number,
    nextMonthTasks: Number,
    ratingTrend: String, // 'increasing', 'decreasing', 'stable'
    growthProjection: Number
  },
  
  // Data quality indicators
  dataQuality: {
    completeness: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    sources: [String] // List of data sources used
  },
  
  // Cache control
  cache: {
    version: {
      type: Number,
      default: 1
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    invalidated: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  // Add compound indexes for performance
  indexes: [
    { userId: 1, type: 1, 'period.start': -1 },
    { userId: 1, 'cache.expiresAt': 1 },
    { type: 1, 'period.start': -1 },
    { 'cache.invalidated': 1, 'cache.expiresAt': 1 }
  ]
});

// Virtual for formatted period
AnalyticsSchema.virtual('formattedPeriod').get(function() {
  const start = this.period.start;
  const end = this.period.end;
  
  if (this.type === 'daily') {
    return start.toLocaleDateString();
  } else if (this.type === 'weekly') {
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  } else if (this.type === 'monthly') {
    return start.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
  
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
});

// Method to check if analytics data is stale
AnalyticsSchema.methods.isStale = function() {
  return this.cache.invalidated || new Date() > this.cache.expiresAt;
};

// Method to invalidate cache
AnalyticsSchema.methods.invalidateCache = function() {
  this.cache.invalidated = true;
  this.cache.expiresAt = new Date(); // Expire immediately
  return this.save();
};

// Method to calculate performance score
AnalyticsSchema.methods.getPerformanceScore = function() {
  const metrics = this.metrics;
  
  // Weighted scoring system
  const weights = {
    successRate: 0.3,
    averageRating: 0.25,
    completionRate: 0.2,
    responseTime: 0.15,
    consistency: 0.1
  };
  
  // Normalize metrics to 0-1 scale
  const normalizedSuccessRate = Math.min(metrics.successRate / 100, 1);
  const normalizedRating = Math.min(metrics.averageRating / 5, 1);
  const normalizedCompletion = Math.min(metrics.completionRate / 100, 1);
  const normalizedResponseTime = Math.max(0, 1 - (metrics.responseTime / 24)); // 24 hours = 0 score
  const normalizedConsistency = Math.min(metrics.totalRatings / 50, 1); // 50+ ratings = max consistency
  
  const score = (
    normalizedSuccessRate * weights.successRate +
    normalizedRating * weights.averageRating +
    normalizedCompletion * weights.completionRate +
    normalizedResponseTime * weights.responseTime +
    normalizedConsistency * weights.consistency
  ) * 100;
  
  return Math.round(score);
};

// Method to get insights summary
AnalyticsSchema.methods.getInsightsSummary = function() {
  const insights = this.insights;
  
  return {
    total: insights.length,
    byType: insights.reduce((acc, insight) => {
      acc[insight.type] = (acc[insight.type] || 0) + 1;
      return acc;
    }, {}),
    byImpact: insights.reduce((acc, insight) => {
      acc[insight.impact] = (acc[insight.impact] || 0) + 1;
      return acc;
    }, {}),
    actionRequired: insights.filter(i => i.actionRequired).length
  };
};

// Static method to aggregate user analytics
AnalyticsSchema.statics.aggregateUserData = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        'period.start': { $gte: startDate },
        'period.end': { $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalTasksCompleted: { $sum: '$metrics.tasksCompleted' },
        totalCreditsEarned: { $sum: '$metrics.creditsEarned' },
        totalCreditsSpent: { $sum: '$metrics.creditsSpent' },
        averageRating: { $avg: '$metrics.averageRating' },
        totalApplications: { $sum: '$metrics.applicationsSubmitted' },
        averageSuccessRate: { $avg: '$metrics.successRate' },
        totalTimeSpent: { $sum: '$metrics.timeSpent' },
        dataPoints: { $sum: 1 }
      }
    }
  ]);
};

// Static method to get platform benchmarks
AnalyticsSchema.statics.getPlatformBenchmarks = async function(timeframe = 'weekly') {
  const now = new Date();
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  
  return this.aggregate([
    {
      $match: {
        type: timeframe,
        'period.start': { $gte: startDate },
        'cache.invalidated': { $ne: true }
      }
    },
    {
      $group: {
        _id: null,
        avgSuccessRate: { $avg: '$metrics.successRate' },
        avgRating: { $avg: '$metrics.averageRating' },
        avgResponseTime: { $avg: '$metrics.responseTime' },
        avgCompletionRate: { $avg: '$metrics.completionRate' },
        avgTaskValue: { $avg: '$metrics.averageTaskValue' },
        totalUsers: { $addToSet: '$userId' },
        totalTasks: { $sum: '$metrics.tasksCompleted' }
      }
    },
    {
      $project: {
        _id: 0,
        avgSuccessRate: { $round: ['$avgSuccessRate', 2] },
        avgRating: { $round: ['$avgRating', 2] },
        avgResponseTime: { $round: ['$avgResponseTime', 2] },
        avgCompletionRate: { $round: ['$avgCompletionRate', 2] },
        avgTaskValue: { $round: ['$avgTaskValue', 2] },
        totalUsers: { $size: '$totalUsers' },
        totalTasks: 1
      }
    }
  ]);
};

// Pre-save middleware to update timestamps and cache
AnalyticsSchema.pre('save', function(next) {
  if (this.isModified('metrics') || this.isModified('timeline')) {
    this.dataQuality.lastUpdated = new Date();
    
    // Reset cache if data is modified
    if (this.isModified('metrics')) {
      this.cache.version += 1;
      this.cache.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      this.cache.invalidated = false;
    }
  }
  next();
});

module.exports = mongoose.model('Analytics', AnalyticsSchema);