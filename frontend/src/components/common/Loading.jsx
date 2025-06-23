import React from 'react';

const Loading = ({
  type = 'spinner',
  size = 'md',
  color = 'blue',
  text = '',
  fullScreen = false,
  overlay = false,
  className = ''
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600',
    yellow: 'border-yellow-600',
    purple: 'border-purple-600',
    gray: 'border-gray-600'
  };

  const Spinner = () => (
    <div className={`loading-spinner ${sizeClasses[size]} ${colorClasses[color]}`} />
  );

  const Dots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-${color}-600 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const Pulse = () => (
    <div className={`${sizeClasses[size]} bg-${color}-600 rounded-full animate-pulse`} />
  );

  const Bars = () => (
    <div className="flex items-end space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1 bg-${color}-600 rounded-full animate-pulse`}
          style={{
            height: `${12 + (i % 2) * 8}px`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.8s'
          }}
        />
      ))}
    </div>
  );

  const Wave = () => (
    <div className="flex items-center space-x-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-2 h-8 bg-${color}-600 rounded-full`}
          style={{
            animation: `wave 1.2s ease-in-out infinite`,
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
    </div>
  );

  const BookFlip = () => (
    <div className="relative">
      <div className="w-12 h-16 bg-blue-600 rounded-sm shadow-lg transform-gpu">
        <div 
          className="absolute inset-0 bg-blue-700 rounded-sm origin-left"
          style={{
            animation: 'bookFlip 2s ease-in-out infinite'
          }}
        />
      </div>
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
        📚
      </div>
    </div>
  );

  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return <Dots />;
      case 'pulse':
        return <Pulse />;
      case 'bars':
        return <Bars />;
      case 'wave':
        return <Wave />;
      case 'book':
        return <BookFlip />;
      default:
        return <Spinner />;
    }
  };

  const content = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      {renderLoader()}
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
        {content}
      </div>
    );
  }

  return content;
};

// Skeleton Loading Component
export const Skeleton = ({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded',
  className = '',
  animate = true
}) => (
  <div 
    className={`${width} ${height} ${rounded} ${animate ? 'loading-pulse' : 'bg-gray-200'} ${className}`}
  />
);

// Card Skeleton
export const CardSkeleton = ({ lines = 3, className = '' }) => (
  <div className={`card p-6 space-y-3 ${className}`}>
    <Skeleton height="h-6" width="w-3/4" />
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height="h-4" width={i === lines - 1 ? 'w-1/2' : 'w-full'} />
    ))}
  </div>
);

// List Skeleton
export const ListSkeleton = ({ items = 5, className = '' }) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <Skeleton width="w-12" height="h-12" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton height="h-4" width="w-3/4" />
          <Skeleton height="h-3" width="w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

// Table Skeleton
export const TableSkeleton = ({ rows = 5, columns = 4, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, j) => (
          <Skeleton key={j} height="h-4" />
        ))}
      </div>
    ))}
  </div>
);

export default Loading;
