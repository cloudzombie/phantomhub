import React from 'react';

interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  description,
  children
}) => {
  return (
    <div className="flex items-start justify-between p-4 border-b border-slate-700/50">
      <div className="flex items-start">
        <div className="mt-0.5 mr-3 p-2 bg-slate-700/30 rounded-md text-slate-400">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">{title}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <div className="ml-4">
        {children}
      </div>
    </div>
  );
};

export default SettingItem; 