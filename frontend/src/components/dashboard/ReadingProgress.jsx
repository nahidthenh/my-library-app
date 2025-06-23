import React from 'react';

const ReadingProgress = ({ goalData, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-full mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!goalData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Reading Progress</h3>
        <p className="text-gray-500">No reading goal data available</p>
      </div>
    );
  }

  const { goal, timeline, status, insights } = goalData;
  const progressPercentage = Math.min((goal.current / goal.yearly) * 100, 100);
  
  const statusColors = {
    completed: 'bg-green-500',
    ahead: 'bg-blue-500',
    on_track: 'bg-green-500',
    behind: 'bg-red-500'
  };

  const statusLabels = {
    completed: 'Goal Completed! 🎉',
    ahead: 'Ahead of Schedule 🚀',
    on_track: 'On Track 📚',
    behind: 'Behind Schedule ⚡'
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reading Progress</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${statusColors[status]}`}>
          {statusLabels[status]}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{goal.current} of {goal.yearly} books</span>
          <span>{goal.percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${statusColors[status]}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{timeline.daysRemaining}</p>
          <p className="text-xs text-gray-500">Days Left</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{goal.remaining}</p>
          <p className="text-xs text-gray-500">Books Needed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {timeline.daysPerBookNeeded || '∞'}
          </p>
          <p className="text-xs text-gray-500">Days per Book</p>
        </div>
      </div>

      {/* Insights */}
      {insights && insights.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Insights & Recommendations</h4>
          {insights.map((insight, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg border-l-4 ${
                insight.type === 'success' ? 'bg-green-50 border-green-400' :
                insight.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                'bg-blue-50 border-blue-400'
              }`}
            >
              <p className="text-sm text-gray-700 mb-1">{insight.message}</p>
              <p className="text-xs text-gray-600">{insight.action}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReadingProgress;
