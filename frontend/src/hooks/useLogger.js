import { useCallback, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// Environment-based log level
const getLogLevel = () => {
  if (process.env.NODE_ENV === 'development') return LOG_LEVELS.DEBUG;
  if (process.env.NODE_ENV === 'production') return LOG_LEVELS.WARN;
  return LOG_LEVELS.INFO;
};

export const useLogger = (componentName = 'Unknown') => {
  const { currentUser } = useAuth();
  const logBuffer = useRef([]);
  const flushTimer = useRef(null);
  const sessionId = useRef(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const currentLogLevel = useRef(getLogLevel());

  // Initialize log file if in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Create log entries container if it doesn't exist
      if (!window.logEntries) {
        window.logEntries = [];
      }
    }
  }, []);

  // Base logging function
  const log = useCallback((level, message, data = {}) => {
    const levelValue = LOG_LEVELS[level];
    
    // Skip if log level is below current threshold
    if (levelValue < currentLogLevel.current) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component: componentName,
      sessionId: sessionId.current,
      userId: currentUser?.id || 'anonymous',
      userRole: currentUser?.primaryRole || 'unknown',
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 100), // Truncate for brevity
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
      } : null
    };

    // Console output with styling
    const colors = {
      DEBUG: '#9E9E9E',
      INFO: '#2196F3',
      WARN: '#FF9800',
      ERROR: '#F44336'
    };

    const consoleMethod = level === 'ERROR' ? 'error' : 
                         level === 'WARN' ? 'warn' : 
                         level === 'DEBUG' ? 'debug' : 'log';

    console[consoleMethod](
      `%c[${timestamp}] ${level} [${componentName}]%c ${message}`,
      `color: ${colors[level]}; font-weight: bold;`,
      'color: inherit;',
      data
    );

    // Add to buffer for batch sending
    logBuffer.current.push(logEntry);

    // Store in development window object for debugging
    if (process.env.NODE_ENV === 'development') {
      window.logEntries.push(logEntry);
      
      // Keep only last 1000 entries
      if (window.logEntries.length > 1000) {
        window.logEntries = window.logEntries.slice(-1000);
      }
    }

    // Auto-flush on error or if buffer is full
    if (level === 'ERROR' || logBuffer.current.length >= 50) {
      flushLogs();
    } else {
      // Schedule flush if not already scheduled
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(flushLogs, 5000); // Flush every 5 seconds
      }
    }
  }, [componentName, currentUser]);

  // Flush logs to server
  const flushLogs = useCallback(async () => {
    if (logBuffer.current.length === 0) return;

    const logsToSend = [...logBuffer.current];
    logBuffer.current = [];

    // Clear flush timer
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }

    try {
      // Only send to server in production or if explicitly enabled
      if (process.env.NODE_ENV === 'production' || process.env.REACT_APP_ENABLE_LOG_SENDING === 'true') {
        await fetch('/api/logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            logs: logsToSend,
            sessionId: sessionId.current
          })
        });
      }

      // Save to localStorage in development for persistence
      if (process.env.NODE_ENV === 'development') {
        const existingLogs = JSON.parse(localStorage.getItem('timeslice_logs') || '[]');
        const allLogs = [...existingLogs, ...logsToSend].slice(-500); // Keep last 500 logs
        localStorage.setItem('timeslice_logs', JSON.stringify(allLogs));
      }

    } catch (error) {
      console.warn('Failed to flush logs:', error);
      
      // Re-add failed logs to buffer for retry
      logBuffer.current = [...logsToSend, ...logBuffer.current];
    }
  }, []);

  // Performance measurement
  const measurePerformance = useCallback((name, fn) => {
    return async (...args) => {
      const start = performance.now();
      const startMemory = performance.memory?.usedJSHeapSize || 0;
      
      try {
        const result = await fn(...args);
        const end = performance.now();
        const endMemory = performance.memory?.usedJSHeapSize || 0;
        
        log('DEBUG', `Performance: ${name}`, {
          duration: Math.round(end - start),
          memoryDelta: Math.round((endMemory - startMemory) / 1024), // KB
          success: true
        });
        
        return result;
      } catch (error) {
        const end = performance.now();
        
        log('ERROR', `Performance: ${name} failed`, {
          duration: Math.round(end - start),
          error: error.message
        });
        
        throw error;
      }
    };
  }, [log]);

  // Error boundary logging
  const logError = useCallback((error, errorInfo = {}) => {
    log('ERROR', `Error caught: ${error.message}`, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      errorInfo,
      component: componentName
    });
  }, [log, componentName]);

  // User interaction logging
  const logInteraction = useCallback((action, element, data = {}) => {
    log('INFO', `User interaction: ${action}`, {
      action,
      element,
      timestamp: Date.now(),
      ...data
    });
  }, [log]);

  // API call logging
  const logApiCall = useCallback((method, url, data = {}) => {
    log('DEBUG', `API call: ${method} ${url}`, {
      method,
      url,
      requestData: data,
      timestamp: Date.now()
    });
  }, [log]);

  // Navigation logging
  const logNavigation = useCallback((from, to, data = {}) => {
    log('INFO', `Navigation: ${from} -> ${to}`, {
      from,
      to,
      ...data
    });
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Flush remaining logs on unmount
      if (logBuffer.current.length > 0) {
        flushLogs();
      }
      
      // Clear timer
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
      }
    };
  }, [flushLogs]);

  // Log level methods
  const debug = useCallback((message, data) => log('DEBUG', message, data), [log]);
  const info = useCallback((message, data) => log('INFO', message, data), [log]);
  const warn = useCallback((message, data) => log('WARN', message, data), [log]);
  const error = useCallback((message, data) => log('ERROR', message, data), [log]);

  // Development utilities
  const getLogHistory = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      return window.logEntries || [];
    }
    return JSON.parse(localStorage.getItem('timeslice_logs') || '[]');
  }, []);

  const clearLogs = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      window.logEntries = [];
    }
    localStorage.removeItem('timeslice_logs');
    logBuffer.current = [];
    info('Logs cleared');
  }, [info]);

  const exportLogs = useCallback((format = 'json') => {
    const logs = getLogHistory();
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'component', 'message', 'userId'];
      const csvContent = [
        headers.join(','),
        ...logs.map(log => [
          log.timestamp,
          log.level,
          log.component,
          `"${log.message.replace(/"/g, '""')}"`,
          log.userId
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timeslice-logs-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `timeslice-logs-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    info('Logs exported', { format, count: logs.length });
  }, [getLogHistory, info]);

  return {
    // Core logging methods
    debug,
    info,
    warn,
    error,
    log,
    
    // Specialized logging
    logError,
    logInteraction,
    logApiCall,
    logNavigation,
    
    // Performance
    measurePerformance,
    
    // Utilities
    flushLogs,
    getLogHistory,
    clearLogs,
    exportLogs,
    
    // Context info
    sessionId: sessionId.current,
    componentName,
    currentLevel: Object.keys(LOG_LEVELS)[currentLogLevel.current],
    
    // Development utilities
    setLogLevel: (level) => {
      currentLogLevel.current = LOG_LEVELS[level] || LOG_LEVELS.INFO;
      info(`Log level changed to ${level}`);
    },
    
    // Buffer status
    getBufferSize: () => logBuffer.current.length,
    
    // Performance info
    getPerformanceInfo: () => ({
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      timing: performance.timing,
      navigation: performance.navigation
    })
  };
};