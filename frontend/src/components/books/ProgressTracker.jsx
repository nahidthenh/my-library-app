import React, { useState } from 'react';

const ProgressTracker = ({ book, onUpdateProgress, loading = false }) => {
  const [currentPage, setCurrentPage] = useState(book?.currentPage || 0);
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateProgress = async () => {
    try {
      await onUpdateProgress(book._id, { currentPage: parseInt(currentPage) });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const calculateReadingTime = (pagesRemaining, avgPagesPerHour = 30) => {
    if (!pagesRemaining || pagesRemaining <= 0) return 'Completed!';
    
    const hoursRemaining = Math.ceil(pagesRemaining / avgPagesPerHour);
    
    if (hoursRemaining < 1) return '< 1 hour';
    if (hoursRemaining < 24) return `~${hoursRemaining} hours`;
    
    const daysRemaining = Math.ceil(hoursRemaining / 24);
    return `~${daysRemaining} days`;
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-blue-500';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!book || book.status !== 'in_progress') {
    return null;
  }

  const progressPercentage = book.pageCount ? Math.round((currentPage / book.pageCount) * 100) : 0;
  const pagesRemaining = book.pageCount ? book.pageCount - currentPage : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reading Progress</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {isEditing ? 'Cancel' : 'Update'}
        </button>
      </div>

      {/* Book Info */}
      <div className="flex items-start space-x-4 mb-6">
        <div className="flex-shrink-0">
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={book.title}
              className="w-16 h-20 object-cover rounded shadow-sm"
            />
          ) : (
            <div className="w-16 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded shadow-sm flex items-center justify-center">
              <span className="text-white text-xs font-bold">📖</span>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">{book.title}</h4>
          <p className="text-sm text-gray-600">by {book.author}</p>
          {book.pageCount && (
            <p className="text-xs text-gray-500 mt-1">{book.pageCount} pages</p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Progress Details */}
      {book.pageCount && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{currentPage}</p>
            <p className="text-xs text-gray-500">Pages Read</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{pagesRemaining}</p>
            <p className="text-xs text-gray-500">Pages Left</p>
          </div>
        </div>
      )}

      {/* Reading Time Estimation */}
      {book.pageCount && pagesRemaining > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900">Estimated Time to Finish</p>
              <p className="text-lg font-bold text-blue-700">
                {calculateReadingTime(pagesRemaining)}
              </p>
            </div>
            <div className="text-blue-400 text-2xl">⏱️</div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Based on 30 pages/hour reading speed
          </p>
        </div>
      )}

      {/* Progress Update Form */}
      {isEditing && (
        <div className="border-t border-gray-200 pt-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Page
              </label>
              <input
                type="number"
                min="0"
                max={book.pageCount || 9999}
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current page"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleUpdateProgress}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Progress'}
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Progress Buttons */}
      {!isEditing && book.pageCount && (
        <div className="border-t border-gray-200 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Quick Updates</p>
          <div className="grid grid-cols-4 gap-2">
            {[10, 25, 50, 100].map((pages) => (
              <button
                key={pages}
                onClick={() => {
                  const newPage = Math.min(currentPage + pages, book.pageCount);
                  setCurrentPage(newPage);
                  onUpdateProgress(book._id, { currentPage: newPage });
                }}
                disabled={currentPage >= book.pageCount}
                className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                +{pages}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completion Button */}
      {progressPercentage >= 95 && (
        <div className="border-t border-gray-200 pt-4 mt-4">
          <button
            onClick={() => onUpdateProgress(book._id, { status: 'completed' })}
            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            🎉 Mark as Completed
          </button>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;
