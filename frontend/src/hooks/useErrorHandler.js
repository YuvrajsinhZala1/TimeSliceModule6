// File: src/hooks/useErrorHandler.js
import { useState, useCallback, useRef, useEffect } from 'react';
import errorHandler from '../utils/errorHandler';
import debugLogger from '../utils/debugLogger';

/**
 * Custom hook for centralized error handling in React components
 * Provides error state management, retry logic, and user feedback
 */
const useErrorHandler = (options = {}) => {
  const {
    context = 'Component',
    showNotifications = true,
    maxRetries = 3,
    retryDelay = 1000,
    onError = null,
    onRetry = null,
    onSuccess = null
  } = options;

  // Error state
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs to track component state
  const componentRef = useRef({ mounted: true, context });
  const errorTimeoutRef = useRef(null);

  // Update component mounted state on unmount
  useEffect(() => {
    return () => {
      componentRef.current.mounted = false;
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Clear current error state
   */
  const clearError = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setError(null);
    setRetryCount(0);
    debugLogger.debug(context, 'Error cleared');
  }, [context]);

  /**
   * Set error with auto-clear timer
   */
  const setErrorWithTimeout = useCallback((errorInfo, timeout = 10000) => {
    setError(errorInfo);
    
    if (timeout > 0) {
      errorTimeoutRef.current = setTimeout(() => {
        if (componentRef.current.mounted) {
          clearError();
        }
      }, timeout);
    }
  }, [clearError]);

  /**
   * Handle error with processing and state update
   */
  const handleError = useCallback((err, additionalData = {}) => {
    if (!componentRef.current.mounted) return;

    const errorInfo = errorHandler.handleError(err, context, {
      ...additionalData,
      retryCount
    });

    setErrorWithTimeout(errorInfo);

    // Call custom error handler if provided
    if (onError) {
      onError(errorInfo, err);
    }

    // Show notification if enabled
    if (showNotifications && typeof window !== 'undefined' && window.showNotification) {
      const notification = errorHandler.createErrorNotification(errorInfo);
      window.showNotification(notification);
    }

    return errorInfo;
  }, [context, retryCount, onError, showNotifications, setErrorWithTimeout]);

  /**
   * Execute async operation with error handling and retry logic
   */
  const executeAsync = useCallback(async (
    asyncOperation, 
    operationOptions = {}
  ) => {
    const {
      retries = maxRetries,
      delay = retryDelay,
      timeout = 30000,
      description = 'async operation',
      clearErrorOnStart = true
    } = operationOptions;

    if (!componentRef.current.mounted) return;

    if (clearErrorOnStart) {
      clearError();
    }

    setIsLoading(true);
    
    debugLogger.info(context, `Starting ${description}`, { retries, timeout });

    try {
      const result = await errorHandler.handleAsync(
        asyncOperation,
        `${context}_${description}`,
        {
          retries,
          retryDelay: delay,
          timeout,
          onError: (errorInfo, attempt) => {
            if (!componentRef.current.mounted) return;
            
            setRetryCount(attempt);
            
            // Call custom retry handler
            if (onRetry) {
              onRetry(attempt, errorInfo);
            }
            
            debugLogger.warn(context, `Retry attempt ${attempt} for ${description}`, {
              errorType: errorInfo.type,
              maxRetries: retries
            });
          },
          onRetry: (attempt, errorInfo) => {
            if (!componentRef.current.mounted) return;
            
            // Show retry notification
            if (showNotifications && typeof window !== 'undefined' && window.showNotification) {
              window.showNotification({
                type: 'info',
                title: 'Retrying...',
                message: `Attempting to retry (${attempt}/${retries})`,
                duration: 2000
              });
            }
          }
        }
      );

      if (!componentRef.current.mounted) return result;

      setIsLoading(false);
      setRetryCount(0);
      
      // Call success handler
      if (onSuccess) {
        onSuccess(result);
      }

      debugLogger.info(context, `${description} completed successfully`);
      
      return result;
    } catch (err) {
      if (!componentRef.current.mounted) return;
      
      setIsLoading(false);
      const errorInfo = handleError(err, { operation: description });
      throw errorInfo;
    }
  }, [
    context, 
    maxRetries, 
    retryDelay, 
    clearError, 
    handleError, 
    onRetry, 
    onSuccess, 
    showNotifications
  ]);

  /**
   * Execute API call with specific error handling
   */
  const executeApiCall = useCallback(async (
    apiCall,
    endpoint,
    method = 'GET',
    apiOptions = {}
  ) => {
    const { requestData = null, ...restOptions } = apiOptions;
    
    return executeAsync(
      apiCall,
      {
        description: `API ${method} ${endpoint}`,
        ...restOptions
      }
    ).catch(errorInfo => {
      // Additional API-specific error logging
      debugLogger.logApiRequest(method, endpoint, requestData, null, errorInfo);
      throw errorInfo;
    });
  }, [executeAsync]);

  /**
   * Retry the last failed operation
   */
  const retry = useCallback(async (customOperation = null) => {
    if (customOperation) {
      return executeAsync(customOperation, { description: 'retry operation' });
    }
    
    // If no custom operation, we can't retry without the original operation
    debugLogger.warn(context, 'Retry called but no operation to retry');
  }, [executeAsync, context]);

  /**
   * Check if current error allows retry
   */
  const canRetry = useCallback(() => {
    return error?.shouldRetry && retryCount < maxRetries;
  }, [error, retryCount, maxRetries]);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback(() => {
    if (!error) return null;
    return errorHandler.getUserMessage(error);
  }, [error]);

  /**
   * Handle form submission with error handling
   */
  const handleFormSubmit = useCallback(async (submitFunction, formData) => {
    return executeAsync(
      () => submitFunction(formData),
      { description: 'form submission' }
    );
  }, [executeAsync]);

  /**
   * Create a wrapped version of a function with error handling
   */
  const wrapWithErrorHandling = useCallback((fn, description = 'wrapped function') => {
    return async (...args) => {
      return executeAsync(() => fn(...args), { description });
    };
  }, [executeAsync]);

  // Export error stats for debugging
  const getErrorStats = useCallback(() => {
    return {
      hasError: !!error,
      errorType: error?.type,
      retryCount,
      isLoading,
      canRetry: canRetry(),
      context: componentRef.current.context
    };
  }, [error, retryCount, isLoading, canRetry]);

  // Debug information
  const debug = {
    context: componentRef.current.context,
    error,
    retryCount,
    isLoading,
    canRetry: canRetry(),
    getStats: getErrorStats,
    exportLogs: () => debugLogger.exportLogs(`error_handler_${context}.json`)
  };

  return {
    // Error state
    error,
    isLoading,
    retryCount,
    
    // Error actions
    handleError,
    clearError,
    retry,
    
    // Async operations
    executeAsync,
    executeApiCall,
    handleFormSubmit,
    
    // Utilities
    canRetry,
    getErrorMessage,
    wrapWithErrorHandling,
    
    // Debug
    debug
  };
};

/**
 * Hook for API-specific error handling
 */
export const useApiErrorHandler = (baseEndpoint = '', defaultOptions = {}) => {
  const errorHandler = useErrorHandler({
    context: `API_${baseEndpoint}`,
    ...defaultOptions
  });

  const apiCall = useCallback(async (endpoint, options = {}) => {
    const {
      method = 'GET',
      data = null,
      params = {},
      headers = {},
      ...restOptions
    } = options;

    const fullEndpoint = `${baseEndpoint}${endpoint}`;
    
    return errorHandler.executeApiCall(
      async () => {
        // This would be your actual API call implementation
        // For example, using axios or fetch
        const response = await fetch(fullEndpoint, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          },
          body: data ? JSON.stringify(data) : undefined,
          ...restOptions
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      },
      fullEndpoint,
      method,
      { requestData: data, ...restOptions }
    );
  }, [baseEndpoint, errorHandler]);

  return {
    ...errorHandler,
    apiCall
  };
};

/**
 * Hook for form-specific error handling
 */
export const useFormErrorHandler = (formName = 'form') => {
  const errorHandler = useErrorHandler({
    context: `Form_${formName}`,
    showNotifications: true
  });

  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = useCallback((fieldName) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((fieldName, message) => {
    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: message
    }));
  }, []);

  const clearAllFieldErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const handleValidationError = useCallback((validationErrors) => {
    if (Array.isArray(validationErrors)) {
      const errorMap = {};
      validationErrors.forEach(error => {
        if (error.field) {
          errorMap[error.field] = error.message;
        }
      });
      setFieldErrors(errorMap);
    } else if (typeof validationErrors === 'object') {
      setFieldErrors(validationErrors);
    }
  }, []);

  return {
    ...errorHandler,
    fieldErrors,
    setFieldError,
    clearFieldError,
    clearAllFieldErrors,
    handleValidationError
  };
};

export default useErrorHandler;