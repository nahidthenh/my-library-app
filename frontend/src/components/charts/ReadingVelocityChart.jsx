import React from 'react';

// Simple fallback chart component
const SimpleBarChart = ({ data, title }) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-2">📊</div>
        <p>No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-16 text-xs text-gray-600 text-right">
              {item.label}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${(item.value / maxValue) * 100}%` }}
              ></div>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                {item.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ReadingVelocityChart = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-16 h-4 bg-gray-200 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = data?.readingVelocity?.slice(-6).map(item => ({
    label: `${item._id.month}/${item._id.year}`,
    value: item.booksCompleted,
    pages: item.totalPages,
    rating: item.averageRating
  })) || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reading Velocity</h3>
        <span className="text-sm text-gray-500">Last 6 months</span>
      </div>

      <SimpleBarChart 
        data={chartData} 
        title="Books Completed per Month"
      />

      {/* Summary Stats */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length)}
              </p>
              <p className="text-xs text-gray-500">Avg/Month</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {chartData.reduce((sum, d) => sum + d.pages, 0)}
              </p>
              <p className="text-xs text-gray-500">Total Pages</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {Math.round(chartData.reduce((sum, d) => sum + (d.rating || 0), 0) / chartData.length * 10) / 10}
              </p>
              <p className="text-xs text-gray-500">Avg Rating</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingVelocityChart;
