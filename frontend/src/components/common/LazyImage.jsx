import React from 'react';
import { useLazyImage, useProgressiveImage } from '../../hooks/useLazyLoad';

/**
 * Lazy loading image component with placeholder support
 */
const LazyImage = ({
  src,
  alt,
  placeholder = null,
  className = '',
  fallback = null,
  progressive = false,
  lowQualitySrc = null,
  onLoad = null,
  onError = null,
  ...props
}) => {
  // Use progressive loading if lowQualitySrc is provided
  const progressiveResult = useProgressiveImage(
    progressive && lowQualitySrc ? lowQualitySrc : src,
    src
  );
  
  // Use regular lazy loading if not progressive
  const lazyResult = useLazyImage(src, placeholder);
  
  // Choose which result to use
  const { imageSrc, isLoaded, error, imageRef } = progressive && lowQualitySrc 
    ? {
        imageSrc: progressiveResult.src,
        isLoaded: progressiveResult.isLoaded,
        error: null,
        imageRef: progressiveResult.imageRef
      }
    : lazyResult;

  // Handle load event
  const handleLoad = (e) => {
    if (onLoad) onLoad(e);
  };

  // Handle error event
  const handleError = (e) => {
    if (onError) onError(e);
  };

  // Show fallback if error and fallback provided
  if (error && fallback) {
    return fallback;
  }

  return (
    <div ref={imageRef} className={`relative overflow-hidden ${className}`}>
      <img
        src={imageSrc || placeholder || '/images/placeholder.svg'}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-70'
        } ${progressive && !progressiveResult?.isHighQuality ? 'filter blur-sm' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      )}
      
      {/* Error state */}
      {error && !fallback && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs">Failed to load</p>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Book cover image component with specific optimizations
 */
export const BookCoverImage = ({ 
  src, 
  title, 
  author,
  size = 'medium',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    small: 'w-16 h-24',
    medium: 'w-24 h-36',
    large: 'w-32 h-48',
    xlarge: 'w-40 h-60'
  };

  const placeholder = `data:image/svg+xml;base64,${btoa(`
    <svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <text x="50%" y="40%" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="14">
        ${title || 'Book Cover'}
      </text>
      <text x="50%" y="60%" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="12">
        ${author || 'Author'}
      </text>
    </svg>
  `)}`;

  const fallback = (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex flex-col items-center justify-center p-2 text-center`}>
      <div className="text-blue-600 mb-1">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <p className="text-xs text-blue-800 font-medium leading-tight">{title}</p>
      {author && <p className="text-xs text-blue-600 mt-1">{author}</p>}
    </div>
  );

  return (
    <LazyImage
      src={src}
      alt={`${title} by ${author}`}
      placeholder={placeholder}
      fallback={fallback}
      className={`${sizeClasses[size]} rounded-lg shadow-sm ${className}`}
      {...props}
    />
  );
};

/**
 * Avatar image component with lazy loading
 */
export const AvatarImage = ({ 
  src, 
  name, 
  size = 'medium',
  className = '',
  ...props 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-10 h-10',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const fallback = (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold`}>
      {initials}
    </div>
  );

  return (
    <LazyImage
      src={src}
      alt={`${name}'s avatar`}
      fallback={fallback}
      className={`${sizeClasses[size]} rounded-full ${className}`}
      {...props}
    />
  );
};

/**
 * Hero image component with progressive loading
 */
export const HeroImage = ({ 
  src, 
  lowQualitySrc,
  alt,
  className = '',
  ...props 
}) => {
  return (
    <LazyImage
      src={src}
      lowQualitySrc={lowQualitySrc}
      alt={alt}
      progressive={!!lowQualitySrc}
      className={`w-full h-full object-cover ${className}`}
      {...props}
    />
  );
};

export default LazyImage;
