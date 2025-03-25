import { useState, useEffect } from 'react';
import { FiMoon, FiSun, FiMonitor } from 'react-icons/fi';
import ThemeService from '../../services/ThemeService';

type ThemeType = 'dark' | 'light' | 'system';

interface ThemeToggleProps {
  compact?: boolean;
  showLabels?: boolean;
}

const ThemeToggle = ({ compact = false, showLabels = true }: ThemeToggleProps) => {
  const [theme, setTheme] = useState<ThemeType>(ThemeService.getConfig().theme);

  useEffect(() => {
    // Listen for theme changes from ThemeService
    const handleThemeChange = (config: { theme: ThemeType }) => {
      setTheme(config.theme);
    };

    ThemeService.addListener(handleThemeChange);
    
    return () => {
      ThemeService.removeListener(handleThemeChange);
    };
  }, []);

  const handleThemeChange = (newTheme: ThemeType) => {
    console.log('ThemeToggle: Changing theme to', newTheme);
    ThemeService.setTheme(newTheme);
    ThemeService.saveToSettings();
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-1">
        <button
          onClick={() => handleThemeChange('dark')}
          className={`p-1.5 rounded-md ${
            theme === 'dark' 
              ? 'bg-slate-700 text-purple-400' 
              : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
          }`}
          title="Dark Theme"
        >
          <FiMoon size={14} />
        </button>
        <button
          onClick={() => handleThemeChange('light')}
          className={`p-1.5 rounded-md ${
            theme === 'light' 
              ? 'bg-slate-700 text-purple-400' 
              : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
          }`}
          title="Light Theme"
        >
          <FiSun size={14} />
        </button>
        <button
          onClick={() => handleThemeChange('system')}
          className={`p-1.5 rounded-md ${
            theme === 'system' 
              ? 'bg-slate-700 text-purple-400' 
              : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
          }`}
          title="System Theme"
        >
          <FiMonitor size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => handleThemeChange('dark')}
        className={`px-3 py-2 rounded flex items-center justify-center ${
          theme === 'dark'
            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            : 'bg-slate-700/30 text-slate-400 border-slate-600/30 hover:text-slate-300'
        } border`}
      >
        <FiMoon size={14} className="mr-2" />
        {showLabels && <span className="text-xs font-medium">Dark</span>}
      </button>
      <button
        onClick={() => handleThemeChange('light')}
        className={`px-3 py-2 rounded flex items-center justify-center ${
          theme === 'light'
            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            : 'bg-slate-700/30 text-slate-400 border-slate-600/30 hover:text-slate-300'
        } border`}
      >
        <FiSun size={14} className="mr-2" />
        {showLabels && <span className="text-xs font-medium">Light</span>}
      </button>
      <button
        onClick={() => handleThemeChange('system')}
        className={`px-3 py-2 rounded flex items-center justify-center ${
          theme === 'system'
            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
            : 'bg-slate-700/30 text-slate-400 border-slate-600/30 hover:text-slate-300'
        } border`}
      >
        <FiMonitor size={14} className="mr-2" />
        {showLabels && <span className="text-xs font-medium">System</span>}
      </button>
    </div>
  );
};

export default ThemeToggle; 