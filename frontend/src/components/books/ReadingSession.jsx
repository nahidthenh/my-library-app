import React, { useState, useEffect } from 'react';

const ReadingSession = ({ book, onSessionComplete }) => {
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [startPage, setStartPage] = useState(book?.currentPage || 0);
  const [currentPage, setCurrentPage] = useState(book?.currentPage || 0);
  const [sessionNotes, setSessionNotes] = useState('');

  useEffect(() => {
    let interval;
    if (sessionActive) {
      interval = setInterval(() => {
        setSessionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const startSession = () => {
    setSessionActive(true);
    setSessionTime(0);
    setStartPage(book?.currentPage || 0);
    setCurrentPage(book?.currentPage || 0);
  };

  const endSession = () => {
    setSessionActive(false);
    
    const sessionData = {
      duration: sessionTime,
      pagesRead: currentPage - startPage,
      startPage,
      endPage: currentPage,
      notes: sessionNotes,
      date: new Date().toISOString()
    };
    
    onSessionComplete?.(sessionData);
    
    // Reset session
    setSessionTime(0);
    setSessionNotes('');
  };

  const calculateReadingSpeed = () => {
    if (sessionTime === 0) return 0;
    const pagesRead = currentPage - startPage;
    const hoursRead = sessionTime / 3600;
    return hoursRead > 0 ? Math.round(pagesRead / hoursRead) : 0;
  };

  if (!book || book.status !== 'in_progress') {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Reading Session</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          sessionActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
          {sessionActive ? '🟢 Active' : '⚪ Inactive'}
        </div>
      </div>

      {/* Session Timer */}
      <div className="text-center mb-6">
        <div className="text-4xl font-bold text-gray-900 mb-2">
          {formatTime(sessionTime)}
        </div>
        <p className="text-sm text-gray-600">
          {sessionActive ? 'Session in progress' : 'Ready to start reading'}
        </p>
      </div>

      {/* Session Controls */}
      <div className="space-y-4 mb-6">
        {!sessionActive ? (
          <button
            onClick={startSession}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            📚 Start Reading Session
          </button>
        ) : (
          <div className="space-y-3">
            {/* Page Progress During Session */}
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700">Current Page:</label>
              <input
                type="number"
                min={startPage}
                max={book.pageCount || 9999}
                value={currentPage}
                onChange={(e) => setCurrentPage(parseInt(e.target.value) || startPage)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Session Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Notes (optional)
              </label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="Thoughts, insights, or notes from this reading session..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <button
              onClick={endSession}
              className="w-full bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              ⏹️ End Session
            </button>
          </div>
        )}
      </div>

      {/* Session Stats */}
      {sessionActive && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{currentPage - startPage}</p>
            <p className="text-xs text-gray-500">Pages Read</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{calculateReadingSpeed()}</p>
            <p className="text-xs text-gray-500">Pages/Hour</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">
              {book.pageCount ? Math.round(((currentPage - startPage) / book.pageCount) * 100) : 0}%
            </p>
            <p className="text-xs text-gray-500">Session Progress</p>
          </div>
        </div>
      )}

      {/* Reading Tips */}
      {!sessionActive && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Reading Tips</h4>
          <div className="space-y-1 text-xs text-gray-600">
            <p>• Find a quiet, comfortable reading environment</p>
            <p>• Take breaks every 25-30 minutes</p>
            <p>• Update your page progress as you read</p>
            <p>• Jot down thoughts or insights in session notes</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingSession;
