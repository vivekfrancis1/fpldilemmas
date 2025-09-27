import { useEffect, useCallback, useRef } from 'react';

interface ErrorPattern {
  pattern: RegExp;
  severity: 'warning' | 'error';
  message: string;
  preventAction?: string;
}

// Common React hooks error patterns to monitor
const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Invalid hook call/i,
    severity: 'error',
    message: 'Invalid hook call detected - hooks must only be called from function components or custom hooks',
    preventAction: 'Ensure hooks are called at the top level of function components'
  },
  {
    pattern: /hook.*called conditionally/i,
    severity: 'error', 
    message: 'Conditional hook call detected - hooks must always be called in the same order',
    preventAction: 'Move hook calls outside of conditional statements'
  },
  {
    pattern: /useEffect.*dependency.*missing/i,
    severity: 'warning',
    message: 'Missing dependency in useEffect detected',
    preventAction: 'Add missing dependencies to useEffect dependency array'
  },
  {
    pattern: /Cannot update.*unmounted component/i,
    severity: 'warning',
    message: 'State update on unmounted component detected',
    preventAction: 'Use cleanup functions or check if component is mounted before state updates'
  },
  {
    pattern: /Warning.*Each child.*unique.*key/i,
    severity: 'warning',
    message: 'Missing or duplicate React keys detected',
    preventAction: 'Ensure each list item has a unique key prop'
  }
];

interface ErrorMonitoringOptions {
  enableConsoleMonitoring?: boolean;
  enableGlobalErrorHandling?: boolean;
  reportToAnalytics?: boolean;
}

export function useErrorMonitoring(options: ErrorMonitoringOptions = {}) {
  const {
    enableConsoleMonitoring = true,
    enableGlobalErrorHandling = true,
    reportToAnalytics = false
  } = options;

  const originalConsoleError = useRef<typeof console.error>();
  const originalConsoleWarn = useRef<typeof console.warn>();
  const errorCounts = useRef<{ [key: string]: number }>({});

  const analyzeError = useCallback((message: string, ...args: any[]) => {
    const fullMessage = [message, ...args].join(' ');
    
    for (const pattern of ERROR_PATTERNS) {
      if (pattern.pattern.test(fullMessage)) {
        const errorKey = pattern.message;
        errorCounts.current[errorKey] = (errorCounts.current[errorKey] || 0) + 1;
        
        // Log enhanced error information
        console.group(`🔍 Error Monitoring - ${pattern.severity.toUpperCase()}`);
        console.log('Pattern matched:', pattern.message);
        console.log('Prevention advice:', pattern.preventAction);
        console.log('Occurrence count:', errorCounts.current[errorKey]);
        console.log('Original message:', fullMessage);
        console.groupEnd();

        // Report to analytics if enabled
        if (reportToAnalytics && window.gtag) {
          window.gtag('event', 'error_monitoring', {
            error_category: pattern.severity,
            error_type: pattern.message,
            error_count: errorCounts.current[errorKey]
          });
        }

        // For critical errors, provide immediate feedback
        if (pattern.severity === 'error' && errorCounts.current[errorKey] <= 2) {
          console.warn(
            '⚠️ CRITICAL: This error pattern has been detected and may cause application instability. ' +
            'Consider implementing the suggested prevention action: ' + pattern.preventAction
          );
        }

        return {
          isKnownPattern: true,
          severity: pattern.severity,
          advice: pattern.preventAction,
          count: errorCounts.current[errorKey]
        };
      }
    }

    return { isKnownPattern: false };
  }, [reportToAnalytics]);

  const handleGlobalError = useCallback((event: ErrorEvent) => {
    const analysis = analyzeError(event.message);
    
    if (analysis.isKnownPattern) {
      console.warn('🚨 Global error caught by error monitoring:', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        analysis
      });
    }
  }, [analyzeError]);

  const handleUnhandledRejection = useCallback((event: PromiseRejectionEvent) => {
    const message = event.reason?.message || String(event.reason);
    const analysis = analyzeError(message);
    
    if (analysis.isKnownPattern) {
      console.warn('🚨 Unhandled promise rejection caught by error monitoring:', {
        reason: event.reason,
        analysis
      });
    }
  }, [analyzeError]);

  useEffect(() => {
    // Set up console monitoring
    if (enableConsoleMonitoring && typeof window !== 'undefined') {
      originalConsoleError.current = console.error;
      originalConsoleWarn.current = console.warn;

      console.error = (...args: any[]) => {
        analyzeError(args.join(' '));
        originalConsoleError.current?.apply(console, args);
      };

      console.warn = (...args: any[]) => {
        analyzeError(args.join(' '));
        originalConsoleWarn.current?.apply(console, args);
      };
    }

    // Set up global error handling
    if (enableGlobalErrorHandling && typeof window !== 'undefined') {
      window.addEventListener('error', handleGlobalError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    return () => {
      // Cleanup console monitoring
      if (originalConsoleError.current) {
        console.error = originalConsoleError.current;
      }
      if (originalConsoleWarn.current) {
        console.warn = originalConsoleWarn.current;
      }

      // Cleanup global error handling
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleGlobalError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [enableConsoleMonitoring, enableGlobalErrorHandling, handleGlobalError, handleUnhandledRejection, analyzeError]);

  // Return monitoring statistics
  const getErrorStats = useCallback(() => {
    return {
      totalErrors: Object.values(errorCounts.current).reduce((sum, count) => sum + count, 0),
      errorBreakdown: { ...errorCounts.current },
      uniqueErrorTypes: Object.keys(errorCounts.current).length
    };
  }, []);

  const clearErrorStats = useCallback(() => {
    errorCounts.current = {};
  }, []);

  return {
    getErrorStats,
    clearErrorStats,
    isMonitoringActive: enableConsoleMonitoring || enableGlobalErrorHandling
  };
}

// React hooks violation detector
export function useHooksViolationDetector() {
  const renderCount = useRef(0);
  const hookCallOrder = useRef<string[]>([]);
  const previousHookOrder = useRef<string[]>([]);

  useEffect(() => {
    renderCount.current += 1;
    
    // Check if hook call order has changed (potential hooks rule violation)
    if (renderCount.current > 1 && previousHookOrder.current.length > 0) {
      const currentOrder = hookCallOrder.current.join(',');
      const previousOrder = previousHookOrder.current.join(',');
      
      if (currentOrder !== previousOrder) {
        console.warn(
          '⚠️ HOOKS VIOLATION DETECTED: Hook call order has changed between renders. ' +
          'This violates the Rules of Hooks and can cause bugs.',
          {
            renderCount: renderCount.current,
            previousOrder: previousHookOrder.current,
            currentOrder: hookCallOrder.current,
            advice: 'Ensure hooks are always called in the same order on every render'
          }
        );
      }
    }

    previousHookOrder.current = [...hookCallOrder.current];
    hookCallOrder.current = [];
  });

  const trackHookCall = useCallback((hookName: string) => {
    hookCallOrder.current.push(hookName);
  }, []);

  return {
    trackHookCall,
    renderCount: renderCount.current
  };
}

// Development-only hook for debugging render cycles
export function useRenderTracker(componentName: string, props?: any) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    renderCount.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.debug(`🔄 Render Tracker - ${componentName}:`, {
        renderCount: renderCount.current,
        timeSinceLastRender: `${timeSinceLastRender}ms`,
        props: props ? Object.keys(props) : 'none'
      });

      // Warn about excessive re-renders
      if (timeSinceLastRender < 50 && renderCount.current > 5) {
        console.warn(
          `⚠️ PERFORMANCE WARNING: ${componentName} is re-rendering very frequently (${renderCount.current} times). ` +
          'This may indicate unnecessary re-renders or missing memoization.'
        );
      }
    }

    lastRenderTime.current = now;
  });

  return renderCount.current;
}