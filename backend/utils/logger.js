const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta, null, 2)}`;
    }
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: fileFormat,
  defaultMeta: {
    service: 'timeslice-backend',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    hostname: require('os').hostname(),
    pid: process.pid
  },
  transports: [
    // Error log file - only errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),

    // Combined log file - all levels
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 10,
      format: fileFormat
    }),

    // Debug log file - debug and above (development only)
    ...(process.env.NODE_ENV !== 'production' ? [
      new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        maxsize: 25 * 1024 * 1024, // 25MB
        maxFiles: 3,
        format: fileFormat
      })
    ] : [])
  ],

  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
} else {
  // In production, only log warnings and errors to console
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'warn'
  }));
}

// Helper functions for structured logging
logger.logRequest = (req, res, next) => {
  const startTime = Date.now();
  
  // Log the incoming request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id,
    headers: {
      authorization: req.get('authorization') ? '[PRESENT]' : '[ABSENT]',
      contentType: req.get('content-type'),
      contentLength: req.get('content-length')
    },
    body: req.method === 'POST' || req.method === 'PUT' ? 
      JSON.stringify(req.body).length > 1000 ? '[LARGE_BODY]' : req.body : undefined,
    timestamp: new Date().toISOString(),
    requestId: req.id || Math.random().toString(36).substr(2, 9)
  });

  // Override res.end to log the response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - startTime;
    
    logger.http('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      responseSize: res.get('content-length') || (chunk ? chunk.length : 0),
      requestId: req.id || 'unknown',
      timestamp: new Date().toISOString()
    });

    // Call the original end function
    originalEnd.call(this, chunk, encoding);
  };

  if (next) next();
};

// Database operation logging
logger.logDatabase = (operation, collection, query, result, duration) => {
  logger.debug('Database operation', {
    operation,
    collection,
    query: JSON.stringify(query).length > 500 ? '[LARGE_QUERY]' : query,
    resultCount: Array.isArray(result) ? result.length : result ? 1 : 0,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

// Performance logging
logger.logPerformance = (operation, duration, metadata = {}) => {
  const logLevel = duration > 5000 ? 'warn' : duration > 1000 ? 'info' : 'debug';
  
  logger.log(logLevel, `Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    ...metadata,
    timestamp: new Date().toISOString()
  });
};

// Security event logging
logger.logSecurity = (event, details, level = 'warn') => {
  logger.log(level, `Security event: ${event}`, {
    securityEvent: event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Business logic logging
logger.logBusiness = (event, details) => {
  logger.info(`Business event: ${event}`, {
    businessEvent: event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Analytics logging
logger.logAnalytics = (event, data) => {
  logger.info(`Analytics: ${event}`, {
    analyticsEvent: event,
    data,
    timestamp: new Date().toISOString()
  });
};

// Error with context
logger.logError = (error, context = {}) => {
  logger.error('Application error', {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    context,
    timestamp: new Date().toISOString()
  });
};

// User activity logging
logger.logUserActivity = (userId, activity, metadata = {}) => {
  logger.info('User activity', {
    userId,
    activity,
    metadata,
    timestamp: new Date().toISOString()
  });
};

// API rate limiting logging
logger.logRateLimit = (identifier, limit, current, windowStart) => {
  logger.warn('Rate limit triggered', {
    identifier,
    limit,
    current,
    windowStart,
    timestamp: new Date().toISOString()
  });
};

// Cache operations
logger.logCache = (operation, key, hit, size) => {
  logger.debug('Cache operation', {
    operation,
    key: key.length > 50 ? key.substring(0, 50) + '...' : key,
    hit: hit !== undefined ? hit : null,
    size,
    timestamp: new Date().toISOString()
  });
};

// External API calls
logger.logExternalAPI = (service, endpoint, method, statusCode, duration) => {
  const logLevel = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'info';
  
  logger.log(logLevel, 'External API call', {
    service,
    endpoint,
    method,
    statusCode,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString()
  });
};

// Startup and shutdown logging
logger.logStartup = (component, details = {}) => {
  logger.info(`Startup: ${component}`, {
    component,
    ...details,
    timestamp: new Date().toISOString()
  });
};

logger.logShutdown = (component, details = {}) => {
  logger.info(`Shutdown: ${component}`, {
    component,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Memory usage logging
logger.logMemoryUsage = () => {
  const usage = process.memoryUsage();
  logger.debug('Memory usage', {
    rss: `${Math.round(usage.rss / 1024 / 1024 * 100) / 100} MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100} MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100} MB`,
    external: `${Math.round(usage.external / 1024 / 1024 * 100) / 100} MB`,
    timestamp: new Date().toISOString()
  });
};

// Log rotation and cleanup
logger.rotateLogFiles = () => {
  // This would typically be handled by winston's built-in rotation
  // but we can add custom cleanup logic here
  logger.info('Log rotation triggered', {
    timestamp: new Date().toISOString()
  });
};

// Export the configured logger
module.exports = logger;