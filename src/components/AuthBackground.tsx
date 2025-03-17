import React from 'react';

interface AuthBackgroundProps {
  children: React.ReactNode;
}

export function AuthBackground({ children }: AuthBackgroundProps) {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-primary-navy via-primary-blue to-primary-orange flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white opacity-10 rounded-full"></div>
        <div className="absolute top-20 right-20 w-60 h-60 bg-primary-yellow opacity-10 rounded-full"></div>
        <div className="absolute bottom-40 left-20 w-40 h-40 bg-primary-orange opacity-10 rounded-full"></div>
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white opacity-10 rounded-full"></div>
        
        {/* Floating shapes */}
        <div className="absolute top-1/4 left-1/4 w-8 h-8 bg-white opacity-20 rounded-md animate-float-slow"></div>
        <div className="absolute top-1/3 right-1/3 w-6 h-6 bg-primary-yellow opacity-20 rounded-full animate-float-medium"></div>
        <div className="absolute bottom-1/4 right-1/4 w-10 h-10 bg-primary-orange opacity-20 rounded-md animate-float-fast"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}