// File: src/utils/analyticsUtils.js
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';

/**
 * Analytics utility functions for TimeSlice platform
 * Provides data processing, calculations, and export functionality
 */

// Session management
let sessionId = null;

export const getSessionId = () => {
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return sessionId;
};

// Local storage for offline event tracking
const LOCAL_EVENTS_KEY = 'timeslice_analytics_events';

export const storeEventLocally = (eventData) => {
  try {
    const existingEvents = getLocalEvents();
    existingEvents.push({
      ...eventData,
      storedAt: new Date().toISOString()
    });
    
    // Keep only last 1000 events to prevent storage overflow
    const eventsToStore = existingEvents.slice(-1000);
    localStorage.setItem(LOCAL_EVENTS_KEY, JSON.stringify(eventsToStore));
  } catch (error) {
    console.warn('Failed to store analytics event locally:', error);
  }
};

export const getLocalEvents = () => {
  try {
    const stored = localStorage.getItem(LOCAL_EVENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to retrieve local analytics events:', error);
    return [];
  }
};

export const clearLocalEvents = () => {
  try {
    localStorage.removeItem(LOCAL_EVENTS_KEY);
  } catch (error) {
    console.warn('Failed to clear local analytics events:', error);
  }
};

// Mock data generation for development
export const generateMockAnalyticsData = (user) => {
  const now = new Date();
  const userType = user?.userType || 'helper';
  
  // Generate earnings data
  const earningsData = generateMockEarnings(userType);
  
  // Generate performance data
  const performanceData = generateMockPerformance(userType);
  
  // Generate trends data
  const trendsData = generateMockTrends(userType);
  
  // Generate insights
  const insightsData = generateMockInsights(userType, performanceData);
  
  return {
    earnings: earningsData,
    performance: performanceData,
    trends: trendsData,
    insights: insightsData,
    generatedAt: now.toISOString(),
    userType
  };
};

const generateMockEarnings = (userType) => {
  const baseEarnings = userType === 'helper' ? 150 : 75;
  const now = new Date();
  
  // Daily earnings for last 30 days
  const daily = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(now, 29 - i);
    const variance = Math.random() * 0.6 + 0.7; // 70-130% of base
    return {
      date: format(date, 'yyyy-MM-dd'),
      earnings: Math.round(baseEarnings * variance * (Math.random() * 0.3 + 0.1))
    };
  });
  
  // Weekly earnings for last 12 weeks
  const weekly = Array.from({ length: 12 }, (_, i) => {
    const date = subWeeks(now, 11 - i);
    const weekEarnings = daily
      .slice(i * 7, (i + 1) * 7)
      .reduce((sum, day) => sum + (day.earnings || 0), 0);
    
    return {
      week: format(date, 'yyyy-\'W\'ww'),
      earnings: weekEarnings,
      date: format(date, 'yyyy-MM-dd')
    };
  });
  
  // Monthly earnings for last 6 months
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(now, 5 - i);
    const variance = Math.random() * 0.4 + 0.8; // 80-120% of base
    return {
      month: format(date, 'yyyy-MM'),
      earnings: Math.round(baseEarnings * 25 * variance),
      date: format(date, 'yyyy-MM-dd')
    };
  });
  
  const totalEarnings = monthly.reduce((sum, month) => sum + month.earnings, 0);
  const currentMonth = monthly[monthly.length - 1]?.earnings || 0;
  const previousMonth = monthly[monthly.length - 2]?.earnings || 0;
  const growth = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0;
  
  return {
    daily,
    weekly,
    monthly,
    total: totalEarnings,
    growth: Math.round(growth * 100) / 100
  };
};

const generateMockPerformance = (userType) => {
  const isHelper = userType === 'helper';
  
  return {
    tasksCompleted: Math.floor(Math.random() * 50) + (isHelper ? 15 : 8),
    averageRating: Math.round((Math.random() * 1 + 4) * 10) / 10, // 4.0-5.0
    responseTime: Math.round((Math.random() * 3 + 1) * 10) / 10, // 1.0-4.0 hours
    completionRate: Math.round((Math.random() * 15 + 85) * 10) / 10, // 85-100%
    customerSatisfaction: Math.round((Math.random() * 10 + 90) * 10) / 10, // 90-100%
    repeatCustomers: Math.round((Math.random() * 30 + 40) * 10) / 10, // 40-70%
    onTimeDelivery: Math.round((Math.random() * 10 + 90) * 10) / 10 // 90-100%
  };
};

const generateMockTrends = (userType) => {
  const skillCategories = [
    'Web Development', 'Mobile Development', 'UI/UX Design', 'Graphic Design',
    'Content Writing', 'Digital Marketing', 'Data Analysis', 'Video Editing',
    'Photography', 'Translation', 'Virtual Assistant', 'SEO'
  ];
  
  const topSkills = skillCategories
    .sort(() => Math.random() - 0.5)
    .slice(0, 6)
    .map((skill, index) => ({
      skill,
      count: Math.floor(Math.random() * 20) + 5,
      growth: Math.round((Math.random() * 40 - 20) * 10) / 10 // -20% to +20%
    }));
  
  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    activity: Math.round((Math.random() * 80 + 20) * 10) / 10, // 20-100% activity
    label: `${hour.toString().padStart(2, '0')}:00`
  }));
  
  const popularCategories = [
    { category: 'Technology', percentage: 35, count: 45 },
    { category: 'Design', percentage: 25, count: 32 },
    { category: 'Writing', percentage: 20, count: 26 },
    { category: 'Marketing', percentage: 15, count: 19 },
    { category: 'Other', percentage: 5, count: 8 }
  ];
  
  const demandForecast = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      demand: Math.round((Math.random() * 30 + 70) * 10) / 10, // 70-100% demand
      dayName: format(date, 'EEEE')
    };
  });
  
  return {
    topSkills,
    peakHours,
    popularCategories,
    demandForecast
  };
};

const generateMockInsights = (userType, performanceData) => {
  const recommendations = [
    'Consider expanding your service offerings to include mobile development',
    'Your response time is excellent - highlight this in your profile',
    'Schedule availability during peak hours (2-6 PM) for better visibility',
    'Adding portfolio samples can increase your booking rate by 40%',
    'Responding within 2 hours increases task acceptance by 65%'
  ].sort(() => Math.random() - 0.5).slice(0, 3);
  
  const marketTrends = [
    'Web development services are in high demand (+25% this month)',
    'Design tasks show consistent growth in your skill area',
    'Premium pricing is well-received by your client base',
    'Short-term tasks (< 4 hours) are trending upward',
    'Weekend availability shows 30% higher booking rates'
  ].sort(() => Math.random() - 0.5).slice(0, 3);
  
  const optimizationSuggestions = [];
  
  if (performanceData.responseTime > 3) {
    optimizationSuggestions.push('Improve response time to increase booking rate');
  }
  
  if (performanceData.completionRate < 95) {
    optimizationSuggestions.push('Focus on completing all accepted tasks');
  }
  
  if (performanceData.averageRating < 4.5) {
    optimizationSuggestions.push('Enhance service quality to improve ratings');
  }
  
  if (optimizationSuggestions.length === 0) {
    optimizationSuggestions.push('Maintain your excellent performance standards');
  }
  
  return {
    recommendations,
    marketTrends,
    optimizationSuggestions
  };
};

// Calculation functions
export const calculateDerivedMetrics = (analyticsData) => {
  const { earnings, performance, trends } = analyticsData;
  
  const avgDailyEarnings = earnings.daily.length > 0 
    ? earnings.daily.reduce((sum, day) => sum + day.earnings, 0) / earnings.daily.length
    : 0;
  
  const avgWeeklyEarnings = earnings.weekly.length > 0
    ? earnings.weekly.reduce((sum, week) => sum + week.earnings, 0) / earnings.weekly.length
    : 0;
  
  const taskValueAvg = performance.tasksCompleted > 0 
    ? earnings.total / performance.tasksCompleted
    : 0;
  
  const productivityScore = calculateProductivityScore(performance);
  
  return {
    avgDailyEarnings: Math.round(avgDailyEarnings * 100) / 100,
    avgWeeklyEarnings: Math.round(avgWeeklyEarnings * 100) / 100,
    taskValueAvg: Math.round(taskValueAvg * 100) / 100,
    productivityScore
  };
};

export const calculatePerformanceScore = (performance) => {
  const weights = {
    averageRating: 0.3,
    completionRate: 0.25,
    customerSatisfaction: 0.25,
    responseTime: 0.2
  };
  
  // Normalize response time (lower is better, max 24 hours)
  const normalizedResponseTime = Math.max(0, 100 - (performance.responseTime / 24) * 100);
  
  const score = (
    (performance.averageRating / 5) * 100 * weights.averageRating +
    performance.completionRate * weights.completionRate +
    performance.customerSatisfaction * weights.customerSatisfaction +
    normalizedResponseTime * weights.responseTime
  );
  
  return Math.round(score * 10) / 10;
};

const calculateProductivityScore = (performance) => {
  const factors = [
    performance.completionRate / 100,
    performance.onTimeDelivery / 100,
    Math.min(performance.averageRating / 5, 1),
    Math.max(0, 1 - (performance.responseTime / 24))
  ];
  
  const score = factors.reduce((sum, factor) => sum + factor, 0) / factors.length * 100;
  return Math.round(score * 10) / 10;
};

export const calculateEarningsGrowth = (earnings, period = 'monthly') => {
  const data = earnings[period] || [];
  if (data.length < 2) return 0;
  
  const current = data[data.length - 1]?.earnings || 0;
  const previous = data[data.length - 2]?.earnings || 0;
  
  if (previous === 0) return current > 0 ? 100 : 0;
  
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
};

export const getTopPerformingCategories = (trends, limit = 5) => {
  return trends.popularCategories
    ?.sort((a, b) => b.count - a.count)
    .slice(0, limit) || [];
};

// Export functions
export const prepareExportData = (analyticsData, dateRange = null) => {
  const { earnings, performance, trends } = analyticsData;
  
  let exportData = {
    summary: {
      totalEarnings: earnings.total,
      earningsGrowth: earnings.growth,
      tasksCompleted: performance.tasksCompleted,
      averageRating: performance.averageRating,
      completionRate: performance.completionRate
    },
    earnings: earnings.daily,
    performance: performance,
    trends: trends.topSkills
  };
  
  // Filter by date range if provided
  if (dateRange) {
    const { startDate, endDate } = dateRange;
    exportData.earnings = earnings.daily.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= new Date(startDate) && dayDate <= new Date(endDate);
    });
  }
  
  return exportData;
};

export const exportToCSV = (data) => {
  const csvData = [];
  
  // Add summary
  csvData.push(['Summary']);
  Object.entries(data.summary).forEach(([key, value]) => {
    csvData.push([key, value]);
  });
  csvData.push(['']); // Empty row
  
  // Add earnings data
  csvData.push(['Date', 'Earnings']);
  data.earnings.forEach(day => {
    csvData.push([day.date, day.earnings]);
  });
  
  const csvContent = csvData.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `timeslice_analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

export const exportToJSON = (data) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `timeslice_analytics_${format(new Date(), 'yyyy-MM-dd')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

export const exportToPDF = (data) => {
  // For PDF export, we would typically use a library like jsPDF
  // For now, we'll create a simple HTML version that can be printed to PDF
  
  const htmlContent = `
    <html>
      <head>
        <title>TimeSlice Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1, h2 { color: #00D4FF; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>TimeSlice Analytics Report</h1>
        <p>Generated on ${format(new Date(), 'PPP')}</p>
        
        <div class="summary">
          <h2>Summary</h2>
          <p><strong>Total Earnings:</strong> ${data.summary.totalEarnings} credits</p>
          <p><strong>Earnings Growth:</strong> ${data.summary.earningsGrowth}%</p>
          <p><strong>Tasks Completed:</strong> ${data.summary.tasksCompleted}</p>
          <p><strong>Average Rating:</strong> ${data.summary.averageRating}/5</p>
          <p><strong>Completion Rate:</strong> ${data.summary.completionRate}%</p>
        </div>
        
        <h2>Daily Earnings</h2>
        <table>
          <thead>
            <tr><th>Date</th><th>Earnings</th></tr>
          </thead>
          <tbody>
            ${data.earnings.map(day => `<tr><td>${day.date}</td><td>${day.earnings}</td></tr>`).join('')}
          </tbody>
        </table>
      </body>
    </html>
  `;
  
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `timeslice_analytics_${format(new Date(), 'yyyy-MM-dd')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return { success: true, filename: link.download };
};

// Date range utilities
export const getDateRange = (period) => {
  const now = new Date();
  
  switch (period) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now)
      };
    case 'week':
      return {
        startDate: subDays(now, 7),
        endDate: now
      };
    case 'month':
      return {
        startDate: subMonths(now, 1),
        endDate: now
      };
    case 'quarter':
      return {
        startDate: subMonths(now, 3),
        endDate: now
      };
    case 'year':
      return {
        startDate: subMonths(now, 12),
        endDate: now
      };
    default:
      return {
        startDate: subMonths(now, 1),
        endDate: now
      };
  }
};

// Trend analysis
export const analyzeTrends = (data, metric = 'earnings') => {
  if (!data || data.length < 2) return { trend: 'stable', change: 0 };
  
  const values = data.map(item => item[metric] || 0);
  const recent = values.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const previous = values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
  
  if (previous === 0) return { trend: 'stable', change: 0 };
  
  const change = ((recent - previous) / previous) * 100;
  
  let trend = 'stable';
  if (change > 5) trend = 'up';
  else if (change < -5) trend = 'down';
  
  return { trend, change: Math.round(change * 10) / 10 };
};

// Performance benchmarking
export const benchmarkPerformance = (userPerformance, platformAverages = {}) => {
  const defaultAverages = {
    averageRating: 4.3,
    completionRate: 88,
    responseTime: 4.2,
    customerSatisfaction: 85
  };
  
  const averages = { ...defaultAverages, ...platformAverages };
  
  return Object.keys(averages).reduce((benchmark, metric) => {
    const userValue = userPerformance[metric] || 0;
    const platformValue = averages[metric];
    
    let status = 'average';
    const difference = userValue - platformValue;
    
    if (metric === 'responseTime') {
      // Lower is better for response time
      if (difference < -1) status = 'excellent';
      else if (difference < 0) status = 'good';
      else if (difference > 2) status = 'poor';
    } else {
      // Higher is better for other metrics
      if (difference > 10) status = 'excellent';
      else if (difference > 0) status = 'good';
      else if (difference < -10) status = 'poor';
    }
    
    benchmark[metric] = {
      userValue,
      platformValue,
      difference: Math.round(difference * 10) / 10,
      status
    };
    
    return benchmark;
  }, {});
};