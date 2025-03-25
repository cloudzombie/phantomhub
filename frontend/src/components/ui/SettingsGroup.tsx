import React from 'react';

interface SettingsGroupProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  icon,
  children
}) => {
  return (
    <div className="mb-6 bg-slate-800 border border-slate-700 rounded-md overflow-hidden">
      <div className="flex items-center px-4 py-3 bg-slate-700/30 border-b border-slate-700">
        <div className="mr-2 text-green-500">
          {icon}
        </div>
        <h2 className="text-sm font-medium text-white">{title}</h2>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
};

export default SettingsGroup; 