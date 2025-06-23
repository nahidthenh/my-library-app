import React from 'react';
import Header from './Header';

const MainLayout = ({ children, className = '' }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className={`max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 ${className}`}>
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
