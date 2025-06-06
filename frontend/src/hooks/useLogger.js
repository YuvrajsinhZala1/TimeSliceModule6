import { useCallback, useRef, useEffect, useMemo } from 'react';
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
  const renderCount = useRef(0);

  // Prevent excessive re-renders from this hook
  renderCount.current += 1;
  if (renderCount.current > 50) {
    console.warn(`useLogger(${componentName}): Too many renders (${renderCount.current})`);
    return createSimpleLogger(componentName);
  }

  // Stable user info that doesn't cause re-renders
  const stableUserInfo = useMemo(() => ({
    userId: currentUser?.id || 'anonymous',
    userRole: currentUser?.primaryRole || currentUser?.userType || 'unknown'
  }), [currentUser?.id, currentUser?.primaryRole, currentUser?.userType]);

  // Initialize log file if in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      if (!window.logEntries) {
        window.logEntries = [];
      }
    }
  }, []); // Empty dependency array

  // Base logging function with minimal dependencies
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
      userId: stableUserInfo.userId,
      userRole: stableUserInfo.userRole,
      message,
      data,
      url: window.location.href,
      renderCount: renderCount.current
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
      `%c[${componentName}] ${level}%c ${message}`,
      `color: ${colors[level]}; font-weight: bold;`,
      'color: inherit;',
      data
    );

    // Add to buffer for batch sending (with size limit)
    logBuffer.current.push(logEntry);
    if (logBuffer.current.length > 100) {
      logBuffer.current = logBuffer.current.slice(-50); // Keep only last 50
    }

    // Store in development window object for debugging
    if (process.env.NODE_ENV === 'development') {
      window.logEntries = window.logEntries || [];
      window.logEntries.push(logEntry);
      
      // Keep only last 500 entries
      if (window.logEntries.length > 500) {
        window.logEntries = window.logEntries.slice(-500);
      }
    }

    // Auto-flush on error or if buffer is full
    if (level === 'ERROR' || logBuffer.current.length >= 25) {
      flushLogs();
    } else {
      // Schedule flush if not already scheduled
      if (!flushTimer.current) {
        flushTimer.current = setTimeout(flushLogs, 10000); // Flush every 10 seconds
      }
    }
  }, [componentName, stableUserInfo.userId, stableUserInfo.userRole]);

  // Stable flush logs function
  const flushLogs = useCallback(() => {
    if (logBuffer.current.length === 0) return;

    const logsToSend = [...logBuffer.current];
    logBuffer.current = [];

    // Clear flush timer
    if (flushTimer.current) {
      clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }

    // Only save to localStorage in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const existingLogs = JSON.parse(localStorage.getItem('timeslice_logs') || '[]');
        const allLogs = [...existingLogs, ...logsToSend].slice(-200); // Keep last 200 logs
        localStorage.setItem('timeslice_logs', JSON.stringify(allLogs));
      } catch (error) {
        console.warn('Failed to save logs to localStorage:', error);
      }
    }
  }, []);

  // Stable logging methods
  const debug = useCallback((message, data) => log('DEBUG', message, data), [log]);
  const info = useCallback((message, data) => log('INFO', message, data), [log]);
  const warn = useCallback((message, data) => log('WARN', message, data), [log]);
  const error = useCallback((message, data) => log('ERROR', message, data), [log]);

  // Stable interaction logging
  const logInteraction = useCallback((action, element, data = {}) => {
    log('INFO', `User interaction: ${action}`, {
      action,
      element,
      timestamp: Date.now(),
      ...data
    });
  }, [log]);

  // Stable API call logging
  const logApiCall = useCallback((method, url, data = {}) => {
    log('DEBUG', `API call: ${method} ${url}`, {
      method,
      url,
      requestData: data,
      timestamp: Date.now()
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

  // Memoized return value to prevent re-renders
  return useMemo(() => ({
    // Core logging methods
    debug,
    info,
    warn,
    error,
    log,
    
    // Specialized logging
    logInteraction,
    logApiCall,
    
    // Utilities
    flushLogs,
    
    // Context info
    sessionId: sessionId.current,
    componentName,
    currentLevel: Object.keys(LOG_LEVELS)[currentLogLevel.current],
    renderCount: renderCount.current
  }), [debug, info, warn, error, log, logInteraction, logApiCall, flushLogs, componentName]);
};

// Simple logger fallback to prevent infinite loops
function createSimpleLogger(componentName) {
  return {
    debug: (msg, data) => console.log(`[${componentName}] DEBUG:`, msg, data),
    info: (msg, data) => console.log(`[${componentName}] INFO:`, msg, data),
    warn: (msg, data) => console.warn(`[${componentName}] WARN:`, msg, data),
    error: (msg, data) => console.error(`[${componentName}] ERROR:`, msg, data),
    log: (level, msg, data) => console.log(`[${componentName}] ${level}:`, msg, data),
    logInteraction: (action, element, data) => console.log(`[${componentName}] INTERACTION:`, action, element, data),
    logApiCall: (method, url, data) => console.log(`[${componentName}] API:`, method, url, data),
    flushLogs: () => {},
    sessionId: 'fallback-session',
    componentName,
    currentLevel: 'INFO',
    renderCount: 999
  };
}