import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => {
  return (
    <div className={`bg-gray-800 dark:bg-gray-900 rounded-lg shadow-lg border border-gray-700 dark:border-gray-600 ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className = '', children }) => {
  return (
    <div className={`p-4 border-b border-gray-700 dark:border-gray-600 bg-gray-750 dark:bg-gray-800 text-gray-100 ${className}`}>
      {children}
    </div>
  );
};

interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

export const CardBody: React.FC<CardBodyProps> = ({ className = '', children }) => {
  return (
    <div className={`p-4 text-gray-200 dark:text-gray-100 ${className}`}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ className = '', children }) => {
  return (
    <div className={`p-4 border-t border-gray-700 dark:border-gray-600 bg-gray-750 dark:bg-gray-800 ${className}`}>
      {children}
    </div>
  );
}; 