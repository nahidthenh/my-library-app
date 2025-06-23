import React from 'react';

const GenreDistributionChart = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/6"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const genreData = data?.genreAnalysis || [];
  const totalBooks = genreData.reduce((sum, genre) => sum + genre.totalBooks, 0);

  const colors = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-yellow-500'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Genre Distribution</h3>
        <span className="text-sm text-gray-500">{totalBooks} total books</span>
      </div>

      {genreData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">📚</div>
          <p>No genre data available</p>
          <p className="text-sm">Add genres to your books to see distribution</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Genre List */}
          <div className="space-y-3">
            {genreData.slice(0, 8).map((genre, index) => {
              const percentage = totalBooks > 0 ? Math.round((genre.totalBooks / totalBooks) * 100) : 0;
              
              return (
                <div key={genre._id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`w-4 h-4 rounded ${colors[index % colors.length]}`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900 capitalize">
                          {genre._id}
                        </span>
                        <span className="text-sm text-gray-600">
                          {genre.totalBooks} books ({percentage}%)
                        </span>
                      </div>
                      <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${colors[index % colors.length]} transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Genre Stats */}
          <div className="pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">{genreData.length}</p>
                <p className="text-xs text-gray-500">Different Genres</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900">
                  {genreData.length > 0 ? genreData[0]._id : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">Most Read Genre</p>
              </div>
            </div>
          </div>

          {/* Completion Rates */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Completion Rates by Genre</h4>
            <div className="space-y-2">
              {genreData.slice(0, 5).map((genre, index) => (
                <div key={`completion-${genre._id}`} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 capitalize">{genre._id}</span>
                  <span className={`font-medium ${
                    genre.completionRate >= 80 ? 'text-green-600' :
                    genre.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(genre.completionRate)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreDistributionChart;
