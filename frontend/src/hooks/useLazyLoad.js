import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for lazy loading with intersection observer
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Intersection threshold (0-1)
 * @param {string} options.rootMargin - Root margin for intersection observer
 * @param {boolean} options.triggerOnce - Whether to trigger only once
 * @returns {Object} - { ref, isIntersecting, hasIntersected }
 */
export const useLazyLoad = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);

        if (isElementIntersecting && !hasIntersected) {
          setHasIntersected(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        }
      },
      {
        threshold,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, hasIntersected]);

  return { ref, isIntersecting, hasIntersected };
};

/**
 * Hook for preloading components on hover or focus
 * @param {Function} importFn - Dynamic import function
 * @returns {Object} - { preload, Component }
 */
export const usePreloadComponent = (importFn) => {
  const [Component, setComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const preload = async () => {
    if (Component || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(() => module.default || module);
    } catch (err) {
      setError(err);
      console.error('Failed to preload component:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return { preload, Component, isLoading, error };
};

/**
 * Hook for lazy loading images with placeholder
 * @param {string} src - Image source URL
 * @param {string} placeholder - Placeholder image URL
 * @returns {Object} - { imageSrc, isLoaded, error, imageRef }
 */
export const useLazyImage = (src, placeholder = null) => {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const { ref: imageRef, hasIntersected } = useLazyLoad({
    threshold: 0.1,
    rootMargin: '100px'
  });

  useEffect(() => {
    if (!hasIntersected || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
      setError(null);
    };

    img.onerror = () => {
      setError(new Error('Failed to load image'));
      setIsLoaded(false);
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, hasIntersected]);

  return { imageSrc, isLoaded, error, imageRef };
};

/**
 * Hook for lazy loading data when component comes into view
 * @param {Function} fetchFn - Function to fetch data
 * @param {Array} dependencies - Dependencies array for useEffect
 * @returns {Object} - { data, loading, error, retry, ref }
 */
export const useLazyData = (fetchFn, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { ref, hasIntersected } = useLazyLoad();

  const fetchData = async () => {
    if (!hasIntersected) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch lazy data:', err);
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [hasIntersected, ...dependencies]);

  return { data, loading, error, retry, ref };
};

/**
 * Hook for progressive image loading with blur effect
 * @param {string} lowQualitySrc - Low quality image source
 * @param {string} highQualitySrc - High quality image source
 * @returns {Object} - { src, isLoaded, isHighQuality, imageRef }
 */
export const useProgressiveImage = (lowQualitySrc, highQualitySrc) => {
  const [src, setSrc] = useState(lowQualitySrc);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHighQuality, setIsHighQuality] = useState(false);
  const { ref: imageRef, hasIntersected } = useLazyLoad();

  useEffect(() => {
    if (!hasIntersected) return;

    // Load low quality image first
    const lowQualityImg = new Image();
    lowQualityImg.onload = () => {
      setSrc(lowQualitySrc);
      setIsLoaded(true);
    };
    lowQualityImg.src = lowQualitySrc;

    // Then load high quality image
    const highQualityImg = new Image();
    highQualityImg.onload = () => {
      setSrc(highQualitySrc);
      setIsHighQuality(true);
    };
    highQualityImg.src = highQualitySrc;

    return () => {
      lowQualityImg.onload = null;
      highQualityImg.onload = null;
    };
  }, [lowQualitySrc, highQualitySrc, hasIntersected]);

  return { src, isLoaded, isHighQuality, imageRef };
};

/**
 * Hook for lazy loading with retry mechanism
 * @param {Function} loadFn - Function to load resource
 * @param {Object} options - Configuration options
 * @returns {Object} - { data, loading, error, retry, retryCount }
 */
export const useLazyLoadWithRetry = (loadFn, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const { ref, hasIntersected } = useLazyLoad();

  const load = async (attempt = 0) => {
    if (!hasIntersected) return;

    setLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      if (attempt < maxRetries) {
        setTimeout(() => {
          setRetryCount(attempt + 1);
          load(attempt + 1);
        }, retryDelay * Math.pow(2, attempt)); // Exponential backoff
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const retry = () => {
    setRetryCount(0);
    load(0);
  };

  useEffect(() => {
    load(0);
  }, [hasIntersected]);

  return { data, loading, error, retry, retryCount, ref };
};

export default useLazyLoad;
