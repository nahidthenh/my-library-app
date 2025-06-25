import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'primary', 
  text = 'Loading...', 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  const spinnerElement = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}>
        <svg 
          className="w-full h-full" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      
      {text && (
        <p className={`text-sm font-medium ${colorClasses[color]} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 bg-white bg-opacity-90 backdrop-blur-sm z-50 flex items-center justify-center ${className}`}>
        {spinnerElement}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      {spinnerElement}
    </div>
  );
};

// Skeleton loader for specific content types
export const SkeletonLoader = ({ type = 'text', count = 1, className = '' }) => {
  const skeletonTypes = {
    text: 'h-4 bg-gray-200 rounded',
    title: 'h-6 bg-gray-200 rounded',
    avatar: 'w-10 h-10 bg-gray-200 rounded-full',
    card: 'h-32 bg-gray-200 rounded-lg',
    button: 'h-10 w-24 bg-gray-200 rounded'
  };

  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={skeletonTypes[type]} />
      ))}
    </div>
  );
};

// Page loading component
export const PageLoader = ({ message = 'Loading page...' }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="large" color="primary" />
      <p className="mt-4 text-lg text-gray-600">{message}</p>
    </div>
  </div>
);

// Inline loading component
export const InlineLoader = ({ text = 'Loading...', className = '' }) => (
  <div className={`flex items-center space-x-2 ${className}`}>
    <LoadingSpinner size="small" color="primary" text="" />
    <span className="text-sm text-gray-600">{text}</span>
  </div>
);

export default LoadingSpinner;
