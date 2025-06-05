// File: src/utils/debugLogger.js

class DebugLogger {
  constructor() {
    this.isEnabled = process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG === 'true';
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
    this.maxLogs = 1000;
    this.logKey = 'timeslice_debug_logs';
    
    // Initialize log levels
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.currentLevel = this.levels[this.logLevel] || this.levels.info;
    
    // Bind methods to preserve context
    this.log = this.log.bind(this);
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.trace = this.trace.bind(this);
    
    if (this.isEnabled) {
      console.log('🐛 Debug Logger initialized', {
        level: this.logLevel,
        enabled: this.isEnabled,
        maxLogs: this.maxLogs
      });
    }
  }

  // Main logging method
  log(level, component, message, data = null, error = null) {
    if (!this.isEnabled || this.levels[level] > this.currentLevel) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      component,
      message,
      data: data ? (typeof data === 'object' ? JSON.parse(JSON.stringify(data)) : data) : null,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : null,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.getSessionId()
    };

    // Console output with styling
    this.outputToConsole(logEntry);
    
    // Store in localStorage for persistence
    this.storeLog(logEntry);
    
    // In production, you would send to logging service
    if (process.env.NODE_ENV === 'production' && level === 'error') {
      this.sendToLoggingService(logEntry);
    }

    return logEntry;
  }

  // Level-specific methods
  error(component, message, data = null, error = null) {
    return this.log('error', component, message, data, error);
  }

  warn(component, message, data = null) {
    return this.log('warn', component, message, data);
  }

  info(component, message, data = null) {
    return this.log('info', component, message, data);
  }

  debug(component, message, data = null) {
    return this.log('debug', component, message, data);
  }

  trace(component, message, data = null) {
    return this.log('trace', component, message, data);
  }

  // Console output with colors and formatting
  outputToConsole(logEntry) {
    const { level, component, message, data, error } = logEntry;
    
    const colors = {
      ERROR: 'color: #ff4444; font-weight: bold',
      WARN: 'color: #ffaa00; font-weight: bold',
      INFO: 'color: #4444ff; font-weight: bold',
      DEBUG: 'color: #888888',
      TRACE: 'color: #aaaaaa'
    };

    const style = colors[level] || colors.INFO;
    const prefix = `[${logEntry.timestamp.slice(11, 23)}] [${level}] [${component}]`;
    
    console.groupCollapsed(`%c${prefix} ${message}`, style);
    
    if (data) {
      console.log('📊 Data:', data);
    }
    
    if (error) {
      console.error('❌ Error Details:', error);
    }
    
    console.log('🔍 Full Log Entry:', logEntry);
    console.groupEnd();
  }

  // Store log in localStorage with rotation
  storeLog(logEntry) {
    try {
      const logs = this.getLogs();
      logs.push(logEntry);
      
      // Rotate logs if too many
      if (logs.length > this.maxLogs) {
        logs.splice(0, logs.length - this.maxLogs);
      }
      
      localStorage.setItem(this.logKey, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  // Get all stored logs
  getLogs() {
    try {
      return JSON.parse(localStorage.getItem(this.logKey) || '[]');
    } catch (error) {
      console.error('Failed to retrieve logs:', error);
      return [];
    }
  }

  // Clear all logs
  clearLogs() {
    try {
      localStorage.removeItem(this.logKey);
      this.info('DebugLogger', 'All logs cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear logs:', error);
      return false;
    }
  }

  // Export logs to file
  exportLogs(filename = null) {
    try {
      const logs = this.getLogs();
      const exportData = {
        exportDate: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs,
        metadata: {
          userAgent: navigator.userAgent,
          url: window.location.href,
          sessionId: this.getSessionId(),
          logLevel: this.logLevel,
          environment: process.env.NODE_ENV
        }
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `timeslice_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.info('DebugLogger', 'Logs exported successfully', { filename: link.download });
      return exportData;
    } catch (error) {
      this.error('DebugLogger', 'Failed to export logs', null, error);
      return null;
    }
  }

  // Get session ID for tracking
  getSessionId() {
    let sessionId = sessionStorage.getItem('timeslice_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('timeslice_session_id', sessionId);
    }
    return sessionId;
  }

  // Filter logs by criteria
  filterLogs(criteria = {}) {
    const logs = this.getLogs();
    return logs.filter(log => {
      if (criteria.level && log.level !== criteria.level.toUpperCase()) return false;
      if (criteria.component && !log.component.includes(criteria.component)) return false;
      if (criteria.since && new Date(log.timestamp) < new Date(criteria.since)) return false;
      if (criteria.until && new Date(log.timestamp) > new Date(criteria.until)) return false;
      if (criteria.message && !log.message.toLowerCase().includes(criteria.message.toLowerCase())) return false;
      return true;
    });
  }

  // Get log statistics
  getStats() {
    const logs = this.getLogs();
    const stats = {
      total: logs.length,
      byLevel: {},
      byComponent: {},
      timeRange: {
        oldest: null,
        newest: null
      },
      errorCount: 0,
      warningCount: 0
    };

    logs.forEach(log => {
      // Count by level
      stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
      
      // Count by component
      stats.byComponent[log.component] = (stats.byComponent[log.component] || 0) + 1;
      
      // Track time range
      if (!stats.timeRange.oldest || log.timestamp < stats.timeRange.oldest) {
        stats.timeRange.oldest = log.timestamp;
      }
      if (!stats.timeRange.newest || log.timestamp > stats.timeRange.newest) {
        stats.timeRange.newest = log.timestamp;
      }
      
      // Count errors and warnings
      if (log.level === 'ERROR') stats.errorCount++;
      if (log.level === 'WARN') stats.warningCount++;
    });

    return stats;
  }

  // Send critical errors to logging service (placeholder)
  sendToLoggingService(logEntry) {
    // In a real application, you would send to services like:
    // - Sentry
    // - LogRocket
    // - DataDog
    // - Custom logging endpoint
    
    if (process.env.REACT_APP_LOGGING_ENDPOINT) {
      fetch(process.env.REACT_APP_LOGGING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry)
      }).catch(error => {
        console.error('Failed to send log to service:', error);
      });
    }
  }

  // Performance monitoring
  startTimer(label) {
    const timer = {
      label,
      startTime: performance.now(),
      start: () => timer.startTime = performance.now(),
      end: () => {
        const duration = performance.now() - timer.startTime;
        this.debug('Performance', `Timer: ${label}`, { duration: `${duration.toFixed(2)}ms` });
        return duration;
      }
    };
    
    this.trace('Performance', `Timer started: ${label}`);
    return timer;
  }

  // Memory usage monitoring
  logMemoryUsage(component) {
    if ('memory' in performance) {
      const memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576 * 100) / 100,
        total: Math.round(performance.memory.totalJSHeapSize / 1048576 * 100) / 100,
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576 * 100) / 100
      };
      
      this.debug(component, 'Memory usage', { memory: `${memory.used}MB / ${memory.total}MB (limit: ${memory.limit}MB)` });
      return memory;
    }
    return null;
  }

  // Network request logging
  logApiRequest(method, url, data = null, response = null, error = null) {
    const logData = {
      method: method.toUpperCase(),
      url,
      requestData: data,
      responseStatus: response?.status,
      responseData: response?.data,
      duration: response?.duration
    };

    if (error) {
      this.error('API', `${method.toUpperCase()} ${url} failed`, logData, error);
    } else {
      this.info('API', `${method.toUpperCase()} ${url}`, logData);
    }
  }

  // Component lifecycle logging
  logComponentLifecycle(component, phase, props = null) {
    this.trace('Component', `${component} ${phase}`, { props });
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Export both the class and instance
export default debugLogger;
export { DebugLogger };