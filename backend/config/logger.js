// Simple logger for development
const logger = {
  info: (message, meta = {}) => {
    console.log(`[INFO] ${message}`, meta);
  },
  
  error: (message, meta = {}) => {
    console.error(`[ERROR] ${message}`, meta);
  },
  
  warn: (message, meta = {}) => {
    console.warn(`[WARN] ${message}`, meta);
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, meta);
    }
  },

  http: (message, meta = {}) => {
    console.log(`[HTTP] ${message}`, meta);
  },

  // Helper methods
  logError: (error, context = {}) => {
    console.error(`[ERROR] ${error.message}`, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context
    });
  },

  logStartup: (component, details = {}) => {
    console.log(`[STARTUP] ${component}`, details);
  },

  logShutdown: (component, details = {}) => {
    console.log(`[SHUTDOWN] ${component}`, details);
  },

  logPerformance: (operation, duration, metadata = {}) => {
    console.log(`[PERFORMANCE] ${operation}: ${duration}ms`, metadata);
  },

  logSecurity: (event, details) => {
    console.warn(`[SECURITY] ${event}`, details);
  },

  logUserActivity: (userId, activity, metadata = {}) => {
    console.log(`[USER_ACTIVITY] ${userId}: ${activity}`, metadata);
  }
};

module.exports = logger;