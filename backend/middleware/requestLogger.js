const logger = require('../utils/logger');

/**
 * Enhanced request logging middleware for TimeSlice API
 * Logs all incoming requests with detailed information for monitoring and debugging
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  // Add request ID to request object for tracing
  req.id = requestId;
  
  // Get user information if available
  const userId = req.user?.id || 'anonymous';
  const userRole = req.user?.primaryRole || 'unknown';
  
  // Get client information
  const clientInfo = {
    ip: req.ip || req.connection.remoteAddress || req.socket.remoteAddress,
    userAgent: req.get('User-Agent') || 'unknown',
    referer: req.get('Referer') || '',
    origin: req.get('Origin') || '',
    acceptLanguage: req.get('Accept-Language') || '',
    acceptEncoding: req.get('Accept-Encoding') || ''
  };

  // Request details
  const requestDetails = {
    method: req.method,
    url: req.originalUrl || req.url,
    path: req.path,
    query: req.query,
    params: req.params,
    protocol: req.protocol,
    secure: req.secure,
    xhr: req.xhr
  };

  // Headers (sanitized)
  const sanitizedHeaders = sanitizeHeaders(req.headers);

  // Body information (sanitized for security)
  const bodyInfo = getBodyInfo(req);

  // Log incoming request
  logger.http('Incoming request', {
    requestId,
    userId,
    userRole,
    ...requestDetails,
    headers: sanitizedHeaders,
    body: bodyInfo,
    client: clientInfo,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });

  // Store original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  const originalEnd = res.end;

  // Override response methods to capture response data
  res.json = function(data) {
    logResponse(req, res, startTime, { type: 'json', data });
    return originalJson.call(this, data);
  };

  res.send = function(data) {
    logResponse(req, res, startTime, { type: 'send', data });
    return originalSend.call(this, data);
  };

  res.end = function(data) {
    logResponse(req, res, startTime, { type: 'end', data });
    return originalEnd.call(this, data);
  };

  // Handle response finish event
  res.on('finish', () => {
    if (!res._loggedResponse) {
      logResponse(req, res, startTime, { type: 'finish' });
    }
  });

  // Handle response close event (client disconnected)
  res.on('close', () => {
    if (!res._loggedResponse) {
      logResponse(req, res, startTime, { type: 'close', clientDisconnected: true });
    }
  });

  // Continue to next middleware
  next();
};

/**
 * Log response details
 */
const logResponse = (req, res, startTime, responseInfo) => {
  if (res._loggedResponse) return; // Prevent double logging
  res._loggedResponse = true;

  const duration = Date.now() - startTime;
  const responseSize = res.get('content-length') || 0;

  // Determine log level based on status code and duration
  let logLevel = 'http';
  if (res.statusCode >= 500) {
    logLevel = 'error';
  } else if (res.statusCode >= 400) {
    logLevel = 'warn';
  } else if (duration > 5000) {
    logLevel = 'warn'; // Slow requests
  }

  // Response details
  const responseDetails = {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    duration: `${duration}ms`,
    responseSize: `${responseSize} bytes`,
    userId: req.user?.id || 'anonymous',
    userRole: req.user?.primaryRole || 'unknown',
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };

  // Add response headers (sanitized)
  responseDetails.responseHeaders = {
    contentType: res.get('content-type'),
    contentLength: res.get('content-length'),
    cacheControl: res.get('cache-control'),
    etag: res.get('etag'),
    lastModified: res.get('last-modified')
  };

  // Add response type and data info
  if (responseInfo) {
    responseDetails.responseType = responseInfo.type;
    
    if (responseInfo.clientDisconnected) {
      responseDetails.clientDisconnected = true;
      logLevel = 'warn';
    }

    // Log response data size and type (not the actual data for security)
    if (responseInfo.data) {
      responseDetails.responseDataType = typeof responseInfo.data;
      if (typeof responseInfo.data === 'string') {
        responseDetails.responseDataSize = responseInfo.data.length;
      } else if (typeof responseInfo.data === 'object') {
        try {
          responseDetails.responseDataSize = JSON.stringify(responseInfo.data).length;
        } catch (e) {
          responseDetails.responseDataSize = 'unknown';
        }
      }
    }
  }

  // Performance categorization
  if (duration > 10000) {
    responseDetails.performanceCategory = 'very_slow';
  } else if (duration > 5000) {
    responseDetails.performanceCategory = 'slow';
  } else if (duration > 1000) {
    responseDetails.performanceCategory = 'moderate';
  } else {
    responseDetails.performanceCategory = 'fast';
  }

  // Log the response
  logger.log(logLevel, 'Request completed', responseDetails);

  // Log performance metrics for slow requests
  if (duration > 1000) {
    logger.logPerformance(`${req.method} ${req.path}`, duration, {
      statusCode: res.statusCode,
      userId: req.user?.id,
      endpoint: req.path,
      category: responseDetails.performanceCategory
    });
  }

  // Log security events
  if (res.statusCode === 401 || res.statusCode === 403) {
    logger.logSecurity('unauthorized_access', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });
  }

  // Log suspicious activity
  if (res.statusCode === 429) { // Rate limited
    logger.logSecurity('rate_limit_hit', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous'
    });
  }
};

/**
 * Generate unique request ID
 */
const generateRequestId = () => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Sanitize headers to remove sensitive information
 */
const sanitizeHeaders = (headers) => {
  const sanitized = { ...headers };
  
  // Remove or mask sensitive headers
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-api-key',
    'x-auth-token',
    'password',
    'secret'
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  // Keep only relevant headers for logging
  const relevantHeaders = [
    'content-type',
    'content-length',
    'accept',
    'accept-language',
    'accept-encoding',
    'cache-control',
    'user-agent',
    'referer',
    'origin',
    'x-requested-with',
    'x-forwarded-for',
    'x-real-ip'
  ];

  const filtered = {};
  relevantHeaders.forEach(header => {
    if (sanitized[header]) {
      filtered[header] = sanitized[header];
    }
  });

  return filtered;
};

/**
 * Get body information for logging (sanitized)
 */
const getBodyInfo = (req) => {
  if (!req.body) {
    return null;
  }

  const bodyInfo = {
    hasBody: true,
    contentType: req.get('content-type'),
    bodyType: typeof req.body
  };

  // Calculate body size
  try {
    if (typeof req.body === 'string') {
      bodyInfo.size = req.body.length;
    } else if (typeof req.body === 'object') {
      bodyInfo.size = JSON.stringify(req.body).length;
      bodyInfo.keys = Object.keys(req.body);
    }
  } catch (e) {
    bodyInfo.size = 'unknown';
  }

  // For development, include sanitized body content
  if (process.env.NODE_ENV === 'development') {
    bodyInfo.content = sanitizeBodyForLogging(req.body);
  }

  return bodyInfo;
};

/**
 * Sanitize request body for logging
 */
const sanitizeBodyForLogging = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'creditCard',
    'ssn',
    'socialSecurityNumber',
    'bankAccount',
    'apiKey',
    'privateKey'
  ];

  const sanitizeObject = (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(item => typeof item === 'object' ? sanitizeObject(item) : item);
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const result = {};
      Object.keys(obj).forEach(key => {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          result[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          result[key] = sanitizeObject(obj[key]);
        } else {
          result[key] = obj[key];
        }
      });
      return result;
    }
    
    return obj;
  };

  return sanitizeObject(sanitized);
};

/**
 * Middleware to skip logging for certain routes
 */
const skipLogging = (patterns = []) => {
  return (req, res, next) => {
    const shouldSkip = patterns.some(pattern => {
      if (typeof pattern === 'string') {
        return req.path === pattern;
      } else if (pattern instanceof RegExp) {
        return pattern.test(req.path);
      }
      return false;
    });

    if (shouldSkip) {
      return next();
    }

    return requestLogger(req, res, next);
  };
};

/**
 * Express error logging middleware
 */
const errorLogger = (err, req, res, next) => {
  logger.logError(err, {
    requestId: req.id,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id || 'anonymous',
    body: getBodyInfo(req),
    params: req.params,
    query: req.query,
    timestamp: new Date().toISOString()
  });

  next(err);
};

module.exports = {
  requestLogger,
  skipLogging,
  errorLogger,
  generateRequestId
};