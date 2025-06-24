import React, { useState } from 'react';
import Header from './Header';
import { BottomNavigation } from './MobileNavigation';
import { useResponsive } from '../../hooks/useResponsive';

const MainLayout = ({ children, className = '' }) => {
  const { isMobile } = useResponsive();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className={`max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 ${className} ${isMobile ? 'pb-20' : ''}`}>
        <div className="px-4 py-6 sm:px-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  );
};

export default MainLayout;
