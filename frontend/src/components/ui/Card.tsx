import React from 'react';

interface CardProps {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children }) => {
  return (
    <div className={`bg-gray-850 rounded-lg shadow-md overflow-hidden ${className}`}>
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
    <div className={`p-4 border-b border-gray-700 ${className}`}>
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
    <div className={`p-4 ${className}`}>
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
    <div className={`p-4 border-t border-gray-700 ${className}`}>
      {children}
    </div>
  );
}; 