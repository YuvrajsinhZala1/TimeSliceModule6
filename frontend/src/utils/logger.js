// File: src/utils/logger.js
/**
 * Advanced logging utility for TimeSlice platform
 * Provides comprehensive logging with performance monitoring, error tracking, and log management
 */

// Log levels with priority
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

// Configuration
const DEFAULT_CONFIG = {
  level: process.env.NODE_ENV === 'production' ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false,
  maxLogSize: 1000, // Maximum number of logs to store
  storageKey: 'timeslice_logs',
  remoteEndpoint: '/api/logs',
  enablePerformanceLogging: true,
  enableErrorTracking: true,
  enableUserTracking: true,
  includeStackTrace: true,
  colorize: true
};

let config = { ...DEFAULT_CONFIG };

// Color codes for console output
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[35m', // Magenta
  TRACE: '\x1b[37m', // White
  RESET: '\x1b[0m'
};

// Performance monitoring
const performanceMetrics = new Map();
const activeTimers = new Map();

// Error tracking
const errorCounts = new Map();
let globalErrorHandler = null;

// User session tracking
let sessionData = {
  sessionId: null,
  userId: null,
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
  startTime: new Date().toISOString(),
  pageViews: 0,
  interactions: 0,
  errors: 0
};

/**
 * Configure the logger
 */
export const configure = (newConfig) => {
  config = { ...config, ...newConfig };
  
  if (config.enableErrorTracking && !globalErrorHandler) {
    setupGlobalErrorHandler();
  }
  
  // Initialize session
  if (config.enableUserTracking && !sessionData.sessionId) {
    initializeSession();
  }
};

/**
 * Initialize user session
 */
const initializeSession = () => {
  sessionData.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionData.startTime = new Date().toISOString();
  
  // Track page visibility
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      log('INFO', 'Logger', `Page visibility changed: ${document.hidden ? 'hidden' : 'visible'}`);
    });
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      log('INFO', 'Logger', 'Page unloading', { 
        sessionDuration: Date.now() - new Date(sessionData.startTime).getTime(),
        pageViews: sessionData.pageViews,
        interactions: sessionData.interactions,
        errors: sessionData.errors
      });
    });
  }
};

/**
 * Set up global error handler
 */
const setupGlobalErrorHandler = () => {
  if (typeof window !== 'undefined') {
    globalErrorHandler = (event) => {
      const error = event.error || event.reason || event;
      logError('Global Error Handler', error, {
        type: event.type,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString()
      });
    };
    
    window.addEventListener('error', globalErrorHandler);
    window.addEventListener('unhandledrejection', globalErrorHandler);
  }
};

/**
 * Core logging function
 */
const log = (level, component, message, data = null, meta = {}) => {
  const levelValue = LOG_LEVELS[level];
  
  // Check if log level is enabled
  if (levelValue > config.level) {
    return;
  }
  
  const timestamp = new Date().toISOString();
  const logEntry = {
    id: generateLogId(),
    timestamp,
    level,
    component,
    message,
    data,
    meta: {
      ...meta,
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      userAgent: sessionData.userAgent,
      memoryUsage: getMemoryUsage(),
      performance: getPerformanceSnapshot()
    }
  };
  
  // Add stack trace for errors and debug level
  if ((level === 'ERROR' || level === 'DEBUG') && config.includeStackTrace) {
    logEntry.stack = new Error().stack;
  }
  
  // Console output
  if (config.enableConsole) {
    outputToConsole(logEntry);
  }
  
  // Storage
  if (config.enableStorage) {
    storeLog(logEntry);
  }
  
  // Remote logging
  if (config.enableRemote) {
    sendToRemote(logEntry);
  }
  
  // Update session data
  updateSessionData(level);
  
  return logEntry;
};

/**
 * Generate unique log ID
 */
const generateLogId = () => {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get memory usage information
 */
const getMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
    };
  }
  return null;
};

/**
 * Get performance snapshot
 */
const getPerformanceSnapshot = () => {
  if (typeof performance !== 'undefined') {
    return {
      timing: performance.now(),
      navigation: performance.navigation ? {
        type: performance.navigation.type,
        redirectCount: performance.navigation.redirectCount
      } : null
    };
  }
  return null;
};

/**
 * Update session data
 */
const updateSessionData = (level) => {
  if (level === 'ERROR') {
    sessionData.errors++;
  }
  
  // Track interactions (INFO level usually indicates user action)
  if (level === 'INFO') {
    sessionData.interactions++;
  }
};

/**
 * Output to console with formatting
 */
const outputToConsole = (logEntry) => {
  const { level, component, message, data, timestamp } = logEntry;
  const color = config.colorize ? COLORS[level] : '';
  const reset = config.colorize ? COLORS.RESET : '';
  
  const prefix = `${color}[${timestamp}] [${level}] [${component}]${reset}`;
  
  if (data) {
    console.log(`${prefix} ${message}`, data);
  } else {
    console.log(`${prefix} ${message}`);
  }
  
  // Additional console methods for different levels
  if (level === 'ERROR' && logEntry.stack) {
    console.error('Stack trace:', logEntry.stack);
  }
  
  if (level === 'WARN') {
    console.warn(`${prefix} ${message}`, data || '');
  }
  
  if (level === 'DEBUG' && data && typeof data === 'object') {
    console.table(data);
  }
};

/**
 * Store log in local storage
 */
const storeLog = (logEntry) => {
  try {
    const existingLogs = getStoredLogs();
    existingLogs.push(logEntry);
    
    // Maintain maximum log size
    const logsToStore = existingLogs.slice(-config.maxLogSize);
    
    localStorage.setItem(config.storageKey, JSON.stringify(logsToStore));
  } catch (error) {
    console.warn('Failed to store log:', error);
  }
};

/**
 * Get stored logs
 */
export const getStoredLogs = () => {
  try {
    const stored = localStorage.getItem(config.storageKey);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to retrieve stored logs:', error);
    return [];
  }
};

/**
 * Clear stored logs
 */
export const clearStoredLogs = () => {
  try {
    localStorage.removeItem(config.storageKey);
    return true;
  } catch (error) {
    console.warn('Failed to clear stored logs:', error);
    return false;
  }
};

/**
 * Send log to remote endpoint
 */
const sendToRemote = async (logEntry) => {
  if (!config.remoteEndpoint) return;
  
  try {
    await fetch(config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(logEntry)
    });
  } catch (error) {
    // Store failed remote logs locally
    const failedLogs = JSON.parse(localStorage.getItem('failed_remote_logs') || '[]');
    failedLogs.push(logEntry);
    localStorage.setItem('failed_remote_logs', JSON.stringify(failedLogs.slice(-100)));
  }
};

/**
 * Retry failed remote logs
 */
export const retryFailedLogs = async () => {
  const failedLogs = JSON.parse(localStorage.getItem('failed_remote_logs') || '[]');
  
  if (failedLogs.length === 0) return;
  
  const successfulLogs = [];
  
  for (const logEntry of failedLogs) {
    try {
      await sendToRemote(logEntry);
      successfulLogs.push(logEntry.id);
    } catch (error) {
      // Keep failed logs for next retry
      break;
    }
  }
  
  // Remove successful logs
  const remainingLogs = failedLogs.filter(log => !successfulLogs.includes(log.id));
  localStorage.setItem('failed_remote_logs', JSON.stringify(remainingLogs));
  
  return successfulLogs.length;
};

/**
 * Public logging methods
 */
export const logError = (component, message, data = null, meta = {}) => {
  // Track error frequency
  const errorKey = `${component}:${message}`;
  errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
  
  return log('ERROR', component, message, data, { 
    ...meta, 
    errorCount: errorCounts.get(errorKey) 
  });
};

export const logWarn = (component, message, data = null, meta = {}) => {
  return log('WARN', component, message, data, meta);
};

export const logInfo = (component, message, data = null, meta = {}) => {
  return log('INFO', component, message, data, meta);
};

export const logDebug = (component, message, data = null, meta = {}) => {
  return log('DEBUG', component, message, data, meta);
};

export const logTrace = (component, message, data = null, meta = {}) => {
  return log('TRACE', component, message, data, meta);
};

/**
 * Performance logging
 */
export const startTimer = (timerName, component = 'Performance') => {
  const startTime = performance.now();
  activeTimers.set(timerName, { startTime, component });
  
  logDebug(component, `Timer started: ${timerName}`);
  
  return timerName;
};

export const endTimer = (timerName) => {
  const timer = activeTimers.get(timerName);
  if (!timer) {
    logWarn('Performance', `Timer not found: ${timerName}`);
    return null;
  }
  
  const endTime = performance.now();
  const duration = endTime - timer.startTime;
  
  activeTimers.delete(timerName);
  
  // Store performance metric
  if (!performanceMetrics.has(timerName)) {
    performanceMetrics.set(timerName, []);
  }
  
  const metrics = performanceMetrics.get(timerName);
  metrics.push({ duration, timestamp: new Date().toISOString() });
  
  // Keep only last 100 measurements
  if (metrics.length > 100) {
    metrics.splice(0, metrics.length - 100);
  }
  
  logInfo(timer.component, `Timer completed: ${timerName}`, {
    duration: Math.round(duration * 100) / 100,
    unit: 'ms'
  });
  
  return duration;
};

export const measureAsync = async (fn, timerName, component = 'Performance') => {
  startTimer(timerName, component);
  try {
    const result = await fn();
    endTimer(timerName);
    return result;
  } catch (error) {
    endTimer(timerName);
    logError(component, `Error in measured function: ${timerName}`, error);
    throw error;
  }
};

export const measureSync = (fn, timerName, component = 'Performance') => {
  startTimer(timerName, component);
  try {
    const result = fn();
    endTimer(timerName);
    return result;
  } catch (error) {
    endTimer(timerName);
    logError(component, `Error in measured function: ${timerName}`, error);
    throw error;
  }
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = (timerName = null) => {
  if (timerName) {
    const metrics = performanceMetrics.get(timerName) || [];
    if (metrics.length === 0) return null;
    
    const durations = metrics.map(m => m.duration);
    return {
      name: timerName,
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      latest: durations[durations.length - 1],
      history: metrics
    };
  }
  
  const allMetrics = {};
  for (const [name, metrics] of performanceMetrics.entries()) {
    allMetrics[name] = getPerformanceMetrics(name);
  }
  
  return allMetrics;
};

/**
 * User tracking
 */
export const setUser = (userId, userData = {}) => {
  sessionData.userId = userId;
  logInfo('Logger', 'User identified', { userId, userData });
};

export const trackPageView = (pageName, additionalData = {}) => {
  sessionData.pageViews++;
  logInfo('Analytics', 'Page view tracked', {
    page: pageName,
    pageViews: sessionData.pageViews,
    ...additionalData
  });
};

export const trackUserInteraction = (action, target, additionalData = {}) => {
  sessionData.interactions++;
  logInfo('Analytics', 'User interaction tracked', {
    action,
    target,
    interactions: sessionData.interactions,
    ...additionalData
  });
};

/**
 * Log analysis and reporting
 */
export const getLogStatistics = (timeframe = '1h') => {
  const logs = getStoredLogs();
  const now = new Date();
  const timeframeMs = parseTimeframe(timeframe);
  const cutoffTime = new Date(now.getTime() - timeframeMs);
  
  const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffTime);
  
  const stats = {
    total: recentLogs.length,
    byLevel: {},
    byComponent: {},
    errors: recentLogs.filter(log => log.level === 'ERROR'),
    warnings: recentLogs.filter(log => log.level === 'WARN'),
    timeframe,
    period: {
      start: cutoffTime.toISOString(),
      end: now.toISOString()
    }
  };
  
  // Count by level
  recentLogs.forEach(log => {
    stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
    stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
  });
  
  return stats;
};

const parseTimeframe = (timeframe) => {
  const match = timeframe.match(/^(\d+)([hmds])$/);
  if (!match) return 3600000; // Default 1 hour
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 3600000;
  }
};

/**
 * Export logs
 */
export const exportLogs = (format = 'json', filter = null) => {
  let logs = getStoredLogs();
  
  if (filter) {
    logs = logs.filter(filter);
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let content, filename, mimeType;
  
  switch (format) {
    case 'csv':
      content = logsToCSV(logs);
      filename = `timeslice_logs_${timestamp}.csv`;
      mimeType = 'text/csv';
      break;
    case 'txt':
      content = logsToText(logs);
      filename = `timeslice_logs_${timestamp}.txt`;
      mimeType = 'text/plain';
      break;
    default:
      content = JSON.stringify(logs, null, 2);
      filename = `timeslice_logs_${timestamp}.json`;
      mimeType = 'application/json';
  }
  
  // Create download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  logInfo('Logger', 'Logs exported', { format, filename, count: logs.length });
  
  return { filename, count: logs.length };
};

const logsToCSV = (logs) => {
  const headers = ['Timestamp', 'Level', 'Component', 'Message', 'Data'];
  const rows = logs.map(log => [
    log.timestamp,
    log.level,
    log.component,
    log.message,
    log.data ? JSON.stringify(log.data) : ''
  ]);
  
  return [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
};

const logsToText = (logs) => {
  return logs.map(log => {
    const data = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
    return `[${log.timestamp}] [${log.level}] [${log.component}] ${log.message}${data}`;
  }).join('\n');
};

/**
 * Health check
 */
export const getLoggerHealth = () => {
  const logs = getStoredLogs();
  const recentErrors = logs.filter(log => 
    log.level === 'ERROR' && 
    new Date(log.timestamp) > new Date(Date.now() - 3600000) // Last hour
  );
  
  return {
    status: recentErrors.length > 10 ? 'unhealthy' : 'healthy',
    totalLogs: logs.length,
    recentErrors: recentErrors.length,
    memoryUsage: getMemoryUsage(),
    performanceMetrics: Object.keys(performanceMetrics).length,
    activeTimers: activeTimers.size,
    session: sessionData,
    config: { ...config, remoteEndpoint: config.remoteEndpoint ? '[CONFIGURED]' : null }
  };
};

// Initialize logger
if (typeof window !== 'undefined') {
  configure({});
}

export default {
  configure,
  logError,
  logWarn,
  logInfo,
  logDebug,
  logTrace,
  startTimer,
  endTimer,
  measureAsync,
  measureSync,
  getPerformanceMetrics,
  setUser,
  trackPageView,
  trackUserInteraction,
  getStoredLogs,
  clearStoredLogs,
  getLogStatistics,
  exportLogs,
  retryFailedLogs,
  getLoggerHealth,
  LOG_LEVELS
};