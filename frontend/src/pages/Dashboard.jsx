import React from 'react';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <MainLayout>
      {/* Welcome Section */}
      <Card className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.displayName?.split(' ')[0] || 'Reader'}! 📚
        </h2>
        <p className="text-gray-600">
          Ready to track your reading journey? Let's see what you're reading today.
        </p>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card padding="md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">📖</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Currently Reading
                </dt>
                <dd className="text-lg font-medium text-gray-900">0</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">✅</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Books Completed
                </dt>
                <dd className="text-lg font-medium text-gray-900">0</dd>
              </dl>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                <span className="text-white text-sm font-medium">📚</span>
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total Books
                </dt>
                <dd className="text-lg font-medium text-gray-900">0</dd>
              </dl>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button variant="primary" className="w-full">
            Add New Book
          </Button>
          <Button variant="secondary" className="w-full">
            View All Books
          </Button>
          <Button variant="secondary" className="w-full">
            Reading Progress
          </Button>
          <Button variant="secondary" className="w-full">
            Statistics
          </Button>
        </div>
      </Card>
    </MainLayout>
  );
};

export default Dashboard;
