const logger = require('./logger');

/**
 * Data Aggregation Utility for TimeSlice Analytics
 * Provides functions for aggregating and processing data for dashboard analytics
 */

class DataAggregator {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Aggregate user performance metrics over time
   * @param {Array} data - Array of data points with timestamps
   * @param {String} timeRange - Time range for aggregation (1d, 7d, 30d, 90d)
   * @param {Array} metrics - Metrics to aggregate
   * @returns {Object} Aggregated performance data
   */
  aggregatePerformanceData(data, timeRange = '7d', metrics = ['successRate', 'rating', 'earnings']) {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        return this.getEmptyAggregation(timeRange, metrics);
      }

      const periods = this.generateTimePeriods(timeRange);
      const aggregated = {
        periods,
        metrics: {},
        summary: {},
        trends: {}
      };

      // Initialize metrics
      metrics.forEach(metric => {
        aggregated.metrics[metric] = [];
        aggregated.summary[metric] = {
          total: 0,
          average: 0,
          min: Number.MAX_VALUE,
          max: Number.MIN_VALUE,
          count: 0
        };
      });

      // Group data by time periods
      const groupedData = this.groupByTimePeriods(data, periods);

      // Calculate aggregations for each period
      periods.forEach((period, index) => {
        const periodData = groupedData[period.key] || [];
        
        metrics.forEach(metric => {
          const values = periodData
            .map(item => this.extractMetricValue(item, metric))
            .filter(val => val !== null && val !== undefined && !isNaN(val));

          if (values.length > 0) {
            const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            const total = values.reduce((sum, val) => sum + val, 0);

            aggregated.metrics[metric].push({
              period: period.label,
              date: period.date,
              value: Math.round(avg * 100) / 100,
              min,
              max,
              total,
              count: values.length
            });

            // Update summary
            aggregated.summary[metric].total += total;
            aggregated.summary[metric].count += values.length;
            aggregated.summary[metric].min = Math.min(aggregated.summary[metric].min, min);
            aggregated.summary[metric].max = Math.max(aggregated.summary[metric].max, max);
          } else {
            aggregated.metrics[metric].push({
              period: period.label,
              date: period.date,
              value: 0,
              min: 0,
              max: 0,
              total: 0,
              count: 0
            });
          }
        });
      });

      // Finalize summary calculations
      metrics.forEach(metric => {
        const summary = aggregated.summary[metric];
        if (summary.count > 0) {
          summary.average = Math.round((summary.total / summary.count) * 100) / 100;
          summary.min = summary.min === Number.MAX_VALUE ? 0 : summary.min;
          summary.max = summary.max === Number.MIN_VALUE ? 0 : summary.max;
        } else {
          summary.min = 0;
          summary.max = 0;
        }

        // Calculate trends
        aggregated.trends[metric] = this.calculateTrend(aggregated.metrics[metric]);
      });

      logger.debug('Performance data aggregated', {
        timeRange,
        metricsCount: metrics.length,
        periodsCount: periods.length,
        dataPointsProcessed: data.length
      });

      return aggregated;

    } catch (error) {
      logger.error('Performance data aggregation failed', {
        error: error.message,
        timeRange,
        metrics,
        dataLength: data?.length || 0
      });
      return this.getEmptyAggregation(timeRange, metrics);
    }
  }

  /**
   * Aggregate category-wise task data
   * @param {Array} tasks - Array of task objects
   * @returns {Object} Category aggregation
   */
  aggregateByCategory(tasks) {
    try {
      const categoryMap = new Map();

      tasks.forEach(task => {
        const category = task.category || 'Uncategorized';
        
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            name: category,
            totalTasks: 0,
            completedTasks: 0,
            activeTasks: 0,
            cancelledTasks: 0,
            totalCredits: 0,
            averageCredits: 0,
            successRate: 0
          });
        }

        const categoryData = categoryMap.get(category);
        categoryData.totalTasks++;
        categoryData.totalCredits += task.credits || 0;

        switch (task.status) {
          case 'completed':
            categoryData.completedTasks++;
            break;
          case 'in-progress':
          case 'assigned':
            categoryData.activeTasks++;
            break;
          case 'cancelled':
            categoryData.cancelledTasks++;
            break;
        }
      });

      // Calculate derived metrics
      const result = Array.from(categoryMap.values()).map(category => ({
        ...category,
        averageCredits: category.totalTasks > 0 
          ? Math.round(category.totalCredits / category.totalTasks) 
          : 0,
        successRate: category.totalTasks > 0 
          ? Math.round((category.completedTasks / category.totalTasks) * 100) 
          : 0,
        completionRate: category.totalTasks > 0 
          ? Math.round((category.completedTasks / category.totalTasks) * 100) 
          : 0
      }));

      return result.sort((a, b) => b.totalTasks - a.totalTasks);

    } catch (error) {
      logger.error('Category aggregation failed', {
        error: error.message,
        tasksCount: tasks?.length || 0
      });
      return [];
    }
  }

  /**
   * Aggregate skills demand data
   * @param {Array} tasks - Array of task objects with skillsRequired
   * @returns {Array} Skills demand data
   */
  aggregateSkillsDemand(tasks) {
    try {
      const skillsMap = new Map();

      tasks.forEach(task => {
        const skills = task.skillsRequired || ['General'];
        
        skills.forEach(skill => {
          if (!skillsMap.has(skill)) {
            skillsMap.set(skill, {
              name: skill,
              demand: 0,
              completedTasks: 0,
              totalCredits: 0,
              averageCredits: 0,
              growthRate: 0,
              marketShare: 0
            });
          }

          const skillData = skillsMap.get(skill);
          skillData.demand++;
          skillData.totalCredits += task.credits || 0;

          if (task.status === 'completed') {
            skillData.completedTasks++;
          }
        });
      });

      const totalDemand = Array.from(skillsMap.values())
        .reduce((sum, skill) => sum + skill.demand, 0);

      // Calculate derived metrics
      const result = Array.from(skillsMap.values()).map(skill => ({
        ...skill,
        averageCredits: skill.demand > 0 
          ? Math.round(skill.totalCredits / skill.demand) 
          : 0,
        completionRate: skill.demand > 0 
          ? Math.round((skill.completedTasks / skill.demand) * 100) 
          : 0,
        marketShare: totalDemand > 0 
          ? Math.round((skill.demand / totalDemand) * 100) 
          : 0,
        growthRate: this.calculateSkillGrowthRate(skill, tasks) // Simplified calculation
      }));

      return result
        .sort((a, b) => b.demand - a.demand)
        .slice(0, 20); // Top 20 skills

    } catch (error) {
      logger.error('Skills demand aggregation failed', {
        error: error.message,
        tasksCount: tasks?.length || 0
      });
      return [];
    }
  }

  /**
   * Generate earnings timeline data
   * @param {Array} bookings - Array of completed bookings
   * @param {String} timeRange - Time range for timeline
   * @returns {Array} Timeline data points
   */
  generateEarningsTimeline(bookings, timeRange = '30d') {
    try {
      const periods = this.generateTimePeriods(timeRange);
      const groupedBookings = this.groupByTimePeriods(bookings, periods, 'completedAt');

      return periods.map(period => {
        const periodBookings = groupedBookings[period.key] || [];
        const earnings = periodBookings.reduce((sum, booking) => sum + (booking.agreedCredits || 0), 0);
        const taskCount = periodBookings.length;

        return {
          date: period.label,
          fullDate: period.date,
          earnings,
          taskCount,
          averageEarning: taskCount > 0 ? Math.round(earnings / taskCount) : 0,
          cumulativeEarnings: 0 // Will be calculated after all periods
        };
      });

    } catch (error) {
      logger.error('Earnings timeline generation failed', {
        error: error.message,
        bookingsCount: bookings?.length || 0
      });
      return [];
    }
  }

  /**
   * Calculate competitive positioning percentiles
   * @param {Number} userValue - User's metric value
   * @param {Array} allValues - All platform values for comparison
   * @returns {Number} Percentile (0-100)
   */
  calculatePercentile(userValue, allValues) {
    try {
      if (!Array.isArray(allValues) || allValues.length === 0) {
        return 50; // Default to 50th percentile if no data
      }

      const validValues = allValues.filter(val => val !== null && val !== undefined && !isNaN(val));
      if (validValues.length === 0) {
        return 50;
      }

      const sortedValues = validValues.sort((a, b) => a - b);
      const belowCount = sortedValues.filter(val => val < userValue).length;
      
      return Math.round((belowCount / sortedValues.length) * 100);

    } catch (error) {
      logger.error('Percentile calculation failed', {
        error: error.message,
        userValue,
        valuesCount: allValues?.length || 0
      });
      return 50;
    }
  }

  /**
   * Generate time periods for aggregation
   * @param {String} timeRange - Time range (1d, 7d, 30d, 90d)
   * @returns {Array} Array of time periods
   */
  generateTimePeriods(timeRange) {
    const periods = [];
    const now = new Date();
    let days, intervalHours;

    switch (timeRange) {
      case '1d':
        days = 1;
        intervalHours = 2; // 2-hour intervals
        break;
      case '7d':
        days = 7;
        intervalHours = 24; // Daily intervals
        break;
      case '30d':
        days = 30;
        intervalHours = 24; // Daily intervals
        break;
      case '90d':
        days = 90;
        intervalHours = 24 * 7; // Weekly intervals
        break;
      default:
        days = 7;
        intervalHours = 24;
    }

    const totalIntervals = Math.ceil((days * 24) / intervalHours);

    for (let i = totalIntervals - 1; i >= 0; i--) {
      const periodEnd = new Date(now.getTime() - (i * intervalHours * 60 * 60 * 1000));
      const periodStart = new Date(periodEnd.getTime() - (intervalHours * 60 * 60 * 1000));

      periods.push({
        key: `period_${i}`,
        label: this.formatPeriodLabel(periodEnd, intervalHours),
        date: periodEnd.toISOString(),
        start: periodStart,
        end: periodEnd
      });
    }

    return periods;
  }

  /**
   * Group data by time periods
   * @param {Array} data - Data to group
   * @param {Array} periods - Time periods
   * @param {String} dateField - Field containing the date
   * @returns {Object} Grouped data
   */
  groupByTimePeriods(data, periods, dateField = 'createdAt') {
    const grouped = {};

    periods.forEach(period => {
      grouped[period.key] = [];
    });

    data.forEach(item => {
      const itemDate = new Date(item[dateField]);
      
      for (const period of periods) {
        if (itemDate >= period.start && itemDate <= period.end) {
          grouped[period.key].push(item);
          break;
        }
      }
    });

    return grouped;
  }

  /**
   * Extract metric value from data item
   * @param {Object} item - Data item
   * @param {String} metric - Metric name
   * @returns {Number} Metric value
   */
  extractMetricValue(item, metric) {
    switch (metric) {
      case 'successRate':
        return item.applicationSuccessRate || item.successRate || 0;
      case 'rating':
        return item.rating || 0;
      case 'earnings':
        return item.creditsEarned || item.agreedCredits || item.earnings || 0;
      case 'completionRate':
        return item.taskCompletionRate || item.completionRate || 0;
      case 'responseTime':
        return item.averageResponseTime || item.responseTime || 0;
      default:
        return item[metric] || 0;
    }
  }

  /**
   * Calculate trend direction and strength
   * @param {Array} metricData - Array of metric values over time
   * @returns {Object} Trend information
   */
  calculateTrend(metricData) {
    try {
      if (!metricData || metricData.length < 2) {
        return { direction: 'stable', strength: 0, change: 0 };
      }

      const values = metricData.map(d => d.value).filter(v => v !== null && !isNaN(v));
      if (values.length < 2) {
        return { direction: 'stable', strength: 0, change: 0 };
      }

      // Simple linear regression for trend
      const n = values.length;
      const sumX = values.reduce((sum, _, i) => sum + i, 0);
      const sumY = values.reduce((sum, val) => sum + val, 0);
      const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
      const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const change = ((values[values.length - 1] - values[0]) / values[0]) * 100;

      let direction = 'stable';
      if (slope > 0.1) direction = 'increasing';
      else if (slope < -0.1) direction = 'decreasing';

      const strength = Math.abs(slope);

      return {
        direction,
        strength: Math.round(strength * 100) / 100,
        change: Math.round(change * 100) / 100,
        slope: Math.round(slope * 100) / 100
      };

    } catch (error) {
      logger.error('Trend calculation failed', {
        error: error.message,
        dataLength: metricData?.length || 0
      });
      return { direction: 'stable', strength: 0, change: 0 };
    }
  }

  /**
   * Format period label for display
   * @param {Date} date - Period date
   * @param {Number} intervalHours - Interval in hours
   * @returns {String} Formatted label
   */
  formatPeriodLabel(date, intervalHours) {
    if (intervalHours < 24) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric'
      });
    } else if (intervalHours === 24) {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } else {
      // Weekly intervals
      return `Week of ${date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })}`;
    }
  }

  /**
   * Calculate skill growth rate (simplified)
   * @param {Object} skill - Skill data
   * @param {Array} tasks - All tasks
   * @returns {Number} Growth rate percentage
   */
  calculateSkillGrowthRate(skill, tasks) {
    // Simplified calculation - in reality, this would compare with previous periods
    const recentTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return taskDate >= thirtyDaysAgo && (task.skillsRequired || []).includes(skill.name);
    }).length;

    const olderTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return taskDate >= sixtyDaysAgo && taskDate < thirtyDaysAgo && (task.skillsRequired || []).includes(skill.name);
    }).length;

    if (olderTasks === 0) return recentTasks > 0 ? 100 : 0;
    return Math.round(((recentTasks - olderTasks) / olderTasks) * 100);
  }

  /**
   * Get empty aggregation structure
   * @param {String} timeRange - Time range
   * @param {Array} metrics - Metrics array
   * @returns {Object} Empty aggregation
   */
  getEmptyAggregation(timeRange, metrics) {
    const periods = this.generateTimePeriods(timeRange);
    const aggregated = {
      periods,
      metrics: {},
      summary: {},
      trends: {}
    };

    metrics.forEach(metric => {
      aggregated.metrics[metric] = periods.map(period => ({
        period: period.label,
        date: period.date,
        value: 0,
        min: 0,
        max: 0,
        total: 0,
        count: 0
      }));

      aggregated.summary[metric] = {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        count: 0
      };

      aggregated.trends[metric] = {
        direction: 'stable',
        strength: 0,
        change: 0
      };
    });

    return aggregated;
  }

  /**
   * Clear aggregation cache
   */
  clearCache() {
    this.cache.clear();
    logger.debug('Data aggregator cache cleared');
  }
}

module.exports = new DataAggregator();