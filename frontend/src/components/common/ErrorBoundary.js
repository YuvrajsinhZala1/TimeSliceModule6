// File: src/components/common/ErrorBoundary.js
import React from 'react';
import debugLogger from '../../utils/debugLogger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
    
    debugLogger.info('ErrorBoundary', 'ErrorBoundary initialized', { 
      component: props.name || 'unnamed' 
    });
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    debugLogger.error('ErrorBoundary', 'Error caught by boundary', {
      errorId,
      errorMessage: error.message,
      errorName: error.name
    }, error);
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    this.setState({ errorInfo });
    
    debugLogger.error('ErrorBoundary', 'Component error details', {
      errorId: this.state.errorId,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'unnamed',
      props: this.props
    }, error);

    // Log memory usage during error
    debugLogger.logMemoryUsage('ErrorBoundary');

    // In production, report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.reportErrorToService(error, errorInfo);
    }
  }

  reportErrorToService = (error, errorInfo) => {
    // Report to error tracking services like Sentry, Bugsnag, etc.
    const errorReport = {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userId: this.props.userId || 'anonymous',
      component: this.props.name || 'unknown'
    };

    // Example: Send to logging endpoint
    if (process.env.REACT_APP_ERROR_REPORTING_ENDPOINT) {
      fetch(process.env.REACT_APP_ERROR_REPORTING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport)
      }).catch(err => {
        debugLogger.error('ErrorBoundary', 'Failed to report error to service', null, err);
      });
    }
  };

  handleRetry = () => {
    debugLogger.info('ErrorBoundary', 'User clicked retry', { 
      errorId: this.state.errorId 
    });
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReload = () => {
    debugLogger.info('ErrorBoundary', 'User clicked reload page', { 
      errorId: this.state.errorId 
    });
    
    window.location.reload();
  };

  exportErrorLogs = () => {
    debugLogger.exportLogs(`error_report_${this.state.errorId}.json`);
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;
      const { fallback: FallbackComponent, showDetails = false } = this.props;

      // If custom fallback component is provided, use it
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo}
            errorId={errorId}
            onRetry={this.handleRetry}
            onReload={this.handleReload}
          />
        );
      }

      // Default error UI
      return (
        <div className="error-boundary-container" style={styles.container}>
          <div className="error-boundary-content" style={styles.content}>
            {/* Error Icon */}
            <div style={styles.iconContainer}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={styles.icon}>
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2"/>
              </svg>
            </div>

            {/* Error Message */}
            <h2 style={styles.heading}>Something went wrong</h2>
            <p style={styles.message}>
              We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
            </p>

            {/* Error ID for reference */}
            <div style={styles.errorId}>
              <strong>Error ID:</strong> {errorId}
            </div>

            {/* Action Buttons */}
            <div style={styles.actions}>
              <button onClick={this.handleRetry} style={styles.primaryButton}>
                Try Again
              </button>
              <button onClick={this.handleReload} style={styles.secondaryButton}>
                Reload Page
              </button>
              {process.env.NODE_ENV === 'development' && (
                <button onClick={this.exportErrorLogs} style={styles.debugButton}>
                  Export Debug Logs
                </button>
              )}
            </div>

            {/* Error Details (Development only) */}
            {(process.env.NODE_ENV === 'development' || showDetails) && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details (Development)</summary>
                <div style={styles.errorDetails}>
                  <h4>Error:</h4>
                  <pre style={styles.pre}>{error && error.toString()}</pre>
                  
                  <h4>Component Stack:</h4>
                  <pre style={styles.pre}>{errorInfo && errorInfo.componentStack}</pre>
                  
                  <h4>Error Stack:</h4>
                  <pre style={styles.pre}>{error && error.stack}</pre>
                </div>
              </details>
            )}

            {/* Help Text */}
            <div style={styles.helpText}>
              <p>If this problem persists, please contact support with the Error ID above.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Styles for the error boundary
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    padding: '20px',
    backgroundColor: '#fafafa',
    border: '1px solid #e5e5e5',
    borderRadius: '8px',
    margin: '20px'
  },
  content: {
    textAlign: 'center',
    maxWidth: '600px',
    width: '100%'
  },
  iconContainer: {
    marginBottom: '20px'
  },
  icon: {
    opacity: 0.7
  },
  heading: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '12px'
  },
  message: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '20px',
    lineHeight: '1.5'
  },
  errorId: {
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '24px',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: '8px',
    borderRadius: '4px',
    display: 'inline-block'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  secondaryButton: {
    backgroundColor: 'white',
    color: '#374151',
    border: '1px solid #d1d5db',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  debugButton: {
    backgroundColor: '#8b5cf6',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  details: {
    textAlign: 'left',
    marginTop: '24px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px'
  },
  summary: {
    cursor: 'pointer',
    fontWeight: '500',
    color: '#dc2626',
    marginBottom: '12px'
  },
  errorDetails: {
    fontSize: '12px'
  },
  pre: {
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
    padding: '12px',
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '11px',
    lineHeight: '1.4',
    margin: '8px 0'
  },
  helpText: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#6b7280'
  }
};

// Higher-order component to wrap components with error boundary
export const withErrorBoundary = (WrappedComponent, errorBoundaryProps = {}) => {
  const WithErrorBoundaryComponent = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = 
    `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithErrorBoundaryComponent;
};

export default ErrorBoundary;