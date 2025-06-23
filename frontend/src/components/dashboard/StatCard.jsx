import React from 'react';

const StatCard = ({
  title,
  value,
  icon,
  color = 'blue',
  subtitle,
  trend,
  onClick,
  loading = false
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
    pink: 'bg-pink-500',
    yellow: 'bg-yellow-500'
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };

  const cardClasses = [
    'card',
    'p-6',
    onClick ? 'card-interactive hover-lift' : 'card-hover',
    'fade-in'
  ].join(' ');

  if (loading) {
    return (
      <div className={cardClasses}>
        <div className="flex items-center">
          <div className="w-12 h-12 loading-pulse rounded-lg"></div>
          <div className="ml-4 flex-1">
            <div className="h-4 loading-pulse rounded w-3/4 mb-2"></div>
            <div className="h-6 loading-pulse rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClasses} onClick={onClick}>
      <div className="flex items-center">
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center shadow-sm hover-glow transition-all duration-200`}>
          <span className="text-white text-xl scale-in">{icon}</span>
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600 slide-down">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900 scale-in">{value}</p>
            {trend && (
              <span className={`ml-2 text-sm font-medium ${trendColors[trend.direction]} bounce-in`}>
                {trend.direction === 'up' ? '↗' : trend.direction === 'down' ? '↘' : '→'} {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1 fade-in">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
