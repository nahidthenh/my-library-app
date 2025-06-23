import React from 'react';

const ReadingHabitsChart = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const habitsData = data?.readingHabits || [];
  const maxCount = Math.max(...habitsData.map(d => d.count), 1);

  const dayColors = [
    'bg-red-400',    // Sunday
    'bg-blue-400',   // Monday  
    'bg-green-400',  // Tuesday
    'bg-yellow-400', // Wednesday
    'bg-purple-400', // Thursday
    'bg-pink-400',   // Friday
    'bg-indigo-400'  // Saturday
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reading Habits</h3>
        <span className="text-sm text-gray-500">Books completed by day</span>
      </div>

      {habitsData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📅</div>
          <p>No reading habit data available</p>
          <p className="text-sm">Complete some books to see your reading patterns</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Day of Week Chart */}
          <div className="grid grid-cols-7 gap-2">
            {habitsData.map((day, index) => {
              const height = maxCount > 0 ? Math.max((day.count / maxCount) * 100, 10) : 10;
              
              return (
                <div key={day.day} className="text-center">
                  <div className="h-24 flex items-end justify-center mb-2">
                    <div
                      className={`w-8 ${dayColors[index]} rounded-t transition-all duration-500 flex items-end justify-center text-white text-xs font-bold pb-1`}
                      style={{ height: `${height}%` }}
                    >
                      {day.count > 0 ? day.count : ''}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 font-medium">
                    {day.day.slice(0, 3)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reading Insights */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Reading Insights</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-gray-900">
                  {habitsData.reduce((max, day) => day.count > max.count ? day : max, habitsData[0])?.day || 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Most Productive Day</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-lg font-bold text-gray-900">
                  {Math.round(habitsData.reduce((sum, day) => sum + day.count, 0) / 7 * 10) / 10}
                </p>
                <p className="text-xs text-gray-500">Avg Books/Day</p>
              </div>
            </div>
          </div>

          {/* Weekly Pattern Analysis */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Weekly Pattern</h4>
            <div className="space-y-2">
              {/* Weekdays vs Weekends */}
              {(() => {
                const weekdayTotal = habitsData.slice(1, 6).reduce((sum, day) => sum + day.count, 0);
                const weekendTotal = habitsData[0].count + habitsData[6].count;
                const total = weekdayTotal + weekendTotal;
                
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Weekdays</span>
                      <span className="font-medium">
                        {weekdayTotal} books ({total > 0 ? Math.round((weekdayTotal / total) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Weekends</span>
                      <span className="font-medium">
                        {weekendTotal} books ({total > 0 ? Math.round((weekendTotal / total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingHabitsChart;
