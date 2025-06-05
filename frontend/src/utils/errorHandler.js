// File: src/utils/errorHandler.js
import debugLogger from './debugLogger';

/**
 * Centralized error handling utility for the TimeSlice application
 * Provides consistent error handling, logging, and user feedback
 */
class ErrorHandler {
  constructor() {
    this.errorTypes = {
      NETWORK: 'NETWORK_ERROR',
      AUTHENTICATION: 'AUTH_ERROR',
      AUTHORIZATION: 'AUTHORIZATION_ERROR',
      VALIDATION: 'VALIDATION_ERROR',
      NOT_FOUND: 'NOT_FOUND_ERROR',
      SERVER: 'SERVER_ERROR',
      CLIENT: 'CLIENT_ERROR',
      UNKNOWN: 'UNKNOWN_ERROR'
    };

    this.errorMessages = {
      [this.errorTypes.NETWORK]: 'Network connection error. Please check your internet connection.',
      [this.errorTypes.AUTHENTICATION]: 'Authentication failed. Please log in again.',
      [this.errorTypes.AUTHORIZATION]: 'You don\'t have permission to perform this action.',
      [this.errorTypes.VALIDATION]: 'Please check your input and try again.',
      [this.errorTypes.NOT_FOUND]: 'The requested resource was not found.',
      [this.errorTypes.SERVER]: 'Server error occurred. Please try again later.',
      [this.errorTypes.CLIENT]: 'An error occurred in the application.',
      [this.errorTypes.UNKNOWN]: 'An unexpected error occurred.'
    };

    debugLogger.info('ErrorHandler', 'Error handler initialized');
  }

  /**
   * Main error handling method
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @param {Object} additionalData - Additional data to log
   * @returns {Object} Processed error information
   */
  handleError(error, context = 'Unknown', additionalData = {}) {
    const errorInfo = this.processError(error, context, additionalData);
    
    // Log the error
    debugLogger.error(context, errorInfo.message, {
      errorType: errorInfo.type,
      statusCode: errorInfo.statusCode,
      additionalData,
      processed: true
    }, error);

    // Log memory usage during error
    debugLogger.logMemoryUsage('ErrorHandler');

    // In production, report critical errors
    if (process.env.NODE_ENV === 'production' && this.isCriticalError(errorInfo)) {
      this.reportCriticalError(errorInfo, context, additionalData);
    }

    return errorInfo;
  }

  /**
   * Process error and determine type and user message
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @param {Object} additionalData - Additional data
   * @returns {Object} Processed error information
   */
  processError(error, context, additionalData) {
    let errorType = this.errorTypes.UNKNOWN;
    let statusCode = null;
    let userMessage = this.errorMessages[this.errorTypes.UNKNOWN];
    let shouldRetry = false;
    let retryAfter = null;

    // Handle different error types
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorType = this.errorTypes.NETWORK;
      userMessage = this.errorMessages[this.errorTypes.NETWORK];
      shouldRetry = true;
    } else if (error.response) {
      // HTTP errors from API calls
      statusCode = error.response.status;
      
      switch (statusCode) {
        case 400:
          errorType = this.errorTypes.VALIDATION;
          userMessage = error.response.data?.message || this.errorMessages[this.errorTypes.VALIDATION];
          break;
        case 401:
          errorType = this.errorTypes.AUTHENTICATION;
          userMessage = this.errorMessages[this.errorTypes.AUTHENTICATION];
          break;
        case 403:
          errorType = this.errorTypes.AUTHORIZATION;
          userMessage = this.errorMessages[this.errorTypes.AUTHORIZATION];
          break;
        case 404:
          errorType = this.errorTypes.NOT_FOUND;
          userMessage = this.errorMessages[this.errorTypes.NOT_FOUND];
          break;
        case 429:
          errorType = this.errorTypes.CLIENT;
          userMessage = 'Too many requests. Please wait before trying again.';
          shouldRetry = true;
          retryAfter = error.response.headers['retry-after'] || 60;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorType = this.errorTypes.SERVER;
          userMessage = this.errorMessages[this.errorTypes.SERVER];
          shouldRetry = true;
          break;
        default:
          errorType = this.errorTypes.CLIENT;
          userMessage = error.response.data?.message || this.errorMessages[this.errorTypes.CLIENT];
      }
    } else if (error.code) {
      // Handle specific error codes
      switch (error.code) {
        case 'NETWORK_ERROR':
        case 'ECONNREFUSED':
        case 'ENOTFOUND':
          errorType = this.errorTypes.NETWORK;
          userMessage = this.errorMessages[this.errorTypes.NETWORK];
          shouldRetry = true;
          break;
        case 'TIMEOUT':
          errorType = this.errorTypes.NETWORK;
          userMessage = 'Request timed out. Please try again.';
          shouldRetry = true;
          break;
        default:
          errorType = this.errorTypes.CLIENT;
          userMessage = error.message || this.errorMessages[this.errorTypes.CLIENT];
      }
    } else {
      // Generic JavaScript errors
      errorType = this.errorTypes.CLIENT;
      userMessage = error.message || this.errorMessages[this.errorTypes.CLIENT];
    }

    return {
      type: errorType,
      message: userMessage,
      originalMessage: error.message,
      statusCode,
      shouldRetry,
      retryAfter,
      timestamp: new Date().toISOString(),
      context,
      stack: error.stack,
      name: error.name,
      additionalData
    };
  }

  /**
   * Handle API errors specifically
   * @param {Error} error - API error
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} requestData - Request data
   * @returns {Object} Processed error information
   */
  handleApiError(error, endpoint, method = 'GET', requestData = null) {
    const context = `API_${method.toUpperCase()}_${endpoint}`;
    const additionalData = {
      endpoint,
      method,
      requestData
    };

    debugLogger.logApiRequest(method, endpoint, requestData, null, error);
    
    return this.handleError(error, context, additionalData);
  }

  /**
   * Handle async operation errors
   * @param {Function} asyncOperation - Async function to execute
   * @param {string} context - Context description
   * @param {Object} options - Error handling options
   * @returns {Promise} Result or error
   */
  async handleAsync(asyncOperation, context = 'AsyncOperation', options = {}) {
    const {
      retries = 0,
      retryDelay = 1000,
      timeout = 30000,
      onError = null,
      onRetry = null
    } = options;

    let lastError = null;
    let attempt = 0;

    while (attempt <= retries) {
      try {
        // Add timeout wrapper if specified
        if (timeout > 0) {
          return await this.withTimeout(asyncOperation(), timeout);
        }
        return await asyncOperation();
      } catch (error) {
        lastError = error;
        attempt++;

        const errorInfo = this.handleError(error, context, { attempt, maxRetries: retries });

        // Call error callback if provided
        if (onError) {
          onError(errorInfo, attempt);
        }

        // If we have retries left and error is retryable
        if (attempt <= retries && errorInfo.shouldRetry) {
          debugLogger.warn(context, `Retrying operation (attempt ${attempt}/${retries})`, {
            retryDelay,
            errorType: errorInfo.type
          });

          if (onRetry) {
            onRetry(attempt, errorInfo);
          }

          // Wait before retrying
          await this.delay(retryDelay * attempt); // Exponential backoff
        } else {
          break;
        }
      }
    }

    // All retries exhausted, throw the last error
    throw lastError;
  }

  /**
   * Wrap a promise with timeout
   * @param {Promise} promise - Promise to wrap
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Promise with timeout
   */
  withTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
      })
    ]);
  }

  /**
   * Delay utility for retries
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Determine if error is critical and should be reported
   * @param {Object} errorInfo - Processed error information
   * @returns {boolean} Whether error is critical
   */
  isCriticalError(errorInfo) {
    return [
      this.errorTypes.SERVER,
      this.errorTypes.UNKNOWN,
      this.errorTypes.CLIENT
    ].includes(errorInfo.type) || errorInfo.statusCode >= 500;
  }

  /**
   * Report critical error to external service
   * @param {Object} errorInfo - Processed error information
   * @param {string} context - Error context
   * @param {Object} additionalData - Additional data
   */
  reportCriticalError(errorInfo, context, additionalData) {
    // This would integrate with error reporting services like:
    // - Sentry
    // - Bugsnag
    // - Rollbar
    // - Custom logging service

    const report = {
      ...errorInfo,
      context,
      additionalData,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: debugLogger.getSessionId(),
      userId: this.getCurrentUserId()
    };

    debugLogger.info('ErrorHandler', 'Reporting critical error', { errorId: errorInfo.timestamp });

    // Example: Send to error reporting endpoint
    if (process.env.REACT_APP_ERROR_REPORTING_ENDPOINT) {
      fetch(process.env.REACT_APP_ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report)
      }).catch(err => {
        debugLogger.error('ErrorHandler', 'Failed to report critical error', null, err);
      });
    }
  }

  /**
   * Get current user ID for error reporting
   * @returns {string} User ID or 'anonymous'
   */
  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || 'anonymous';
    } catch {
      return 'anonymous';
    }
  }

  /**
   * Create user-friendly error message
   * @param {Object} errorInfo - Processed error information
   * @returns {string} User-friendly message
   */
  getUserMessage(errorInfo) {
    if (errorInfo.shouldRetry) {
      return `${errorInfo.message} Please try again.`;
    }
    return errorInfo.message;
  }

  /**
   * Create error notification object
   * @param {Object} errorInfo - Processed error information
   * @returns {Object} Notification object
   */
  createErrorNotification(errorInfo) {
    return {
      type: 'error',
      title: 'Error',
      message: this.getUserMessage(errorInfo),
      duration: errorInfo.shouldRetry ? 5000 : 8000,
      action: errorInfo.shouldRetry ? 'retry' : null,
      timestamp: errorInfo.timestamp
    };
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// Export both the class and instance
export default errorHandler;
export { ErrorHandler };