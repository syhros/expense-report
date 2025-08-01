import React from 'react';
import TopNavigation from './TopNavigation';

interface MainLayoutProps {
  children: React.ReactNode;
  maxWidthClass?: string;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, maxWidthClass = 'max-w-7xl' }) => {
  return (
    <div className="min-h-screen bg-gray-900">
      <TopNavigation />
      <main className="pt-32 px-6 pb-6">
        <div className={`${maxWidthClass} mx-auto`}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;