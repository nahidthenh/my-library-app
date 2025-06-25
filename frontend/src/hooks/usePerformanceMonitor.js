import { useState, useEffect, useRef } from 'react';

/**
 * Hook for monitoring application performance metrics
 * @returns {Object} Performance metrics and utilities
 */
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState({
    loadTime: null,
    renderTime: null,
    memoryUsage: null,
    connectionType: null,
    isSlowConnection: false
  });

  const renderStartTime = useRef(performance.now());
  const componentMountTime = useRef(null);

  useEffect(() => {
    componentMountTime.current = performance.now();
    
    // Measure initial load time
    const measureLoadTime = () => {
      if (performance.timing) {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        setMetrics(prev => ({ ...prev, loadTime }));
      }
    };

    // Measure memory usage
    const measureMemoryUsage = () => {
      if (performance.memory) {
        const memoryUsage = {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100,
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024 * 100) / 100,
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024 * 100) / 100
        };
        setMetrics(prev => ({ ...prev, memoryUsage }));
      }
    };

    // Measure connection type
    const measureConnection = () => {
      if (navigator.connection) {
        const connection = navigator.connection;
        const isSlowConnection = connection.effectiveType === 'slow-2g' || 
                                connection.effectiveType === '2g' ||
                                connection.downlink < 1.5;
        
        setMetrics(prev => ({
          ...prev,
          connectionType: connection.effectiveType,
          isSlowConnection
        }));
      }
    };

    // Initial measurements
    measureLoadTime();
    measureMemoryUsage();
    measureConnection();

    // Periodic memory monitoring
    const memoryInterval = setInterval(measureMemoryUsage, 30000);

    // Listen for connection changes
    if (navigator.connection) {
      navigator.connection.addEventListener('change', measureConnection);
    }

    return () => {
      clearInterval(memoryInterval);
      if (navigator.connection) {
        navigator.connection.removeEventListener('change', measureConnection);
      }
    };
  }, []);

  // Measure render time when component updates
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setMetrics(prev => ({ ...prev, renderTime }));
  });

  return metrics;
};

/**
 * Hook for measuring specific operation performance
 * @returns {Object} Performance measurement utilities
 */
export const usePerformanceMeasure = () => {
  const [measurements, setMeasurements] = useState({});

  const startMeasure = (name) => {
    performance.mark(`${name}-start`);
  };

  const endMeasure = (name) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    const duration = Math.round(measure.duration * 100) / 100;
    
    setMeasurements(prev => ({
      ...prev,
      [name]: duration
    }));

    // Clean up marks and measures
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);

    return duration;
  };

  const measureAsync = async (name, asyncOperation) => {
    startMeasure(name);
    try {
      const result = await asyncOperation();
      endMeasure(name);
      return result;
    } catch (error) {
      endMeasure(name);
      throw error;
    }
  };

  return {
    measurements,
    startMeasure,
    endMeasure,
    measureAsync
  };
};

/**
 * Hook for monitoring Core Web Vitals
 * @returns {Object} Core Web Vitals metrics
 */
export const useCoreWebVitals = () => {
  const [vitals, setVitals] = useState({
    lcp: null, // Largest Contentful Paint
    fid: null, // First Input Delay
    cls: null, // Cumulative Layout Shift
    fcp: null, // First Contentful Paint
    ttfb: null // Time to First Byte
  });

  useEffect(() => {
    // Measure LCP
    const measureLCP = () => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          setVitals(prev => ({ ...prev, lcp: Math.round(lastEntry.startTime) }));
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      }
    };

    // Measure FID
    const measureFID = () => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            setVitals(prev => ({ ...prev, fid: Math.round(entry.processingStart - entry.startTime) }));
          });
        });
        observer.observe({ entryTypes: ['first-input'] });
      }
    };

    // Measure CLS
    const measureCLS = () => {
      if ('PerformanceObserver' in window) {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              setVitals(prev => ({ ...prev, cls: Math.round(clsValue * 1000) / 1000 }));
            }
          });
        });
        observer.observe({ entryTypes: ['layout-shift'] });
      }
    };

    // Measure FCP
    const measureFCP = () => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              setVitals(prev => ({ ...prev, fcp: Math.round(entry.startTime) }));
            }
          });
        });
        observer.observe({ entryTypes: ['paint'] });
      }
    };

    // Measure TTFB
    const measureTTFB = () => {
      if (performance.timing) {
        const ttfb = performance.timing.responseStart - performance.timing.navigationStart;
        setVitals(prev => ({ ...prev, ttfb }));
      }
    };

    measureLCP();
    measureFID();
    measureCLS();
    measureFCP();
    measureTTFB();
  }, []);

  return vitals;
};

/**
 * Hook for monitoring bundle loading performance
 * @returns {Object} Bundle loading metrics
 */
export const useBundlePerformance = () => {
  const [bundleMetrics, setBundleMetrics] = useState({
    totalSize: 0,
    loadedChunks: 0,
    failedChunks: 0,
    loadTimes: {}
  });

  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
            const size = entry.transferSize || entry.encodedBodySize || 0;
            const loadTime = entry.responseEnd - entry.startTime;
            
            setBundleMetrics(prev => ({
              ...prev,
              totalSize: prev.totalSize + size,
              loadedChunks: prev.loadedChunks + 1,
              loadTimes: {
                ...prev.loadTimes,
                [entry.name]: Math.round(loadTime)
              }
            }));
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });

      return () => observer.disconnect();
    }
  }, []);

  return bundleMetrics;
};

/**
 * Performance monitoring component for development
 */
export const PerformanceMonitor = ({ enabled = process.env.NODE_ENV === 'development' }) => {
  const performanceMetrics = usePerformanceMonitor();
  const coreWebVitals = useCoreWebVitals();
  const bundleMetrics = useBundlePerformance();

  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg font-mono z-50 max-w-xs">
      <div className="space-y-1">
        <div className="font-bold text-yellow-400">Performance Monitor</div>
        
        {performanceMetrics.loadTime && (
          <div>Load: {performanceMetrics.loadTime}ms</div>
        )}
        
        {performanceMetrics.renderTime && (
          <div>Render: {Math.round(performanceMetrics.renderTime)}ms</div>
        )}
        
        {performanceMetrics.memoryUsage && (
          <div>Memory: {performanceMetrics.memoryUsage.used}MB</div>
        )}
        
        {coreWebVitals.lcp && (
          <div>LCP: {coreWebVitals.lcp}ms</div>
        )}
        
        {coreWebVitals.fid && (
          <div>FID: {coreWebVitals.fid}ms</div>
        )}
        
        {coreWebVitals.cls && (
          <div>CLS: {coreWebVitals.cls}</div>
        )}
        
        {performanceMetrics.connectionType && (
          <div className={performanceMetrics.isSlowConnection ? 'text-red-400' : 'text-green-400'}>
            Connection: {performanceMetrics.connectionType}
          </div>
        )}
        
        <div>Chunks: {bundleMetrics.loadedChunks}</div>
        <div>Size: {Math.round(bundleMetrics.totalSize / 1024)}KB</div>
      </div>
    </div>
  );
};

export default usePerformanceMonitor;
