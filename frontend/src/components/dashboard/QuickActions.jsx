import React from 'react';
import { useNavigate } from 'react-router-dom';

const QuickActions = ({ onAddBook, onViewBooks, onViewAnalytics }) => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Add New Book',
      description: 'Add a book to your library',
      icon: '➕',
      color: 'bg-blue-600 hover:bg-blue-700',
      onClick: onAddBook || (() => navigate('/books'))
    },
    {
      title: 'View Library',
      description: 'Browse all your books',
      icon: '📚',
      color: 'bg-green-600 hover:bg-green-700',
      onClick: onViewBooks || (() => navigate('/books'))
    },
    {
      title: 'Reading Analytics',
      description: 'View detailed statistics',
      icon: '📊',
      color: 'bg-purple-600 hover:bg-purple-700',
      onClick: onViewAnalytics || (() => navigate('/analytics'))
    },
    {
      title: 'Set Goals',
      description: 'Update reading goals',
      icon: '🎯',
      color: 'bg-orange-600 hover:bg-orange-700',
      onClick: () => navigate('/goals')
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className={`
              ${action.color} text-white p-4 rounded-lg transition-all duration-200 
              transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 
              focus:ring-offset-2 focus:ring-blue-500
            `}
          >
            <div className="text-center">
              <div className="text-2xl mb-2">{action.icon}</div>
              <h4 className="font-medium text-sm mb-1">{action.title}</h4>
              <p className="text-xs opacity-90">{action.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Additional Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Tips</h4>
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">💡</span>
            <span>Set a daily reading goal to build consistency</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">📖</span>
            <span>Update your reading progress regularly</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="mr-2">⭐</span>
            <span>Rate books after completing them</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActions;
