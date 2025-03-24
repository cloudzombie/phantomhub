type ThemeType = 'dark' | 'light' | 'system';

interface ThemeConfig {
  theme: ThemeType;
  compactView: boolean;
  dateFormat: string;
}

type ThemeListener = (config: ThemeConfig) => void;

class ThemeService {
  private static instance: ThemeService;
  private config: ThemeConfig;
  private listeners: Set<ThemeListener> = new Set();
  private systemPreferenceMediaQuery: MediaQueryList;

  private constructor() {
    // Default configuration
    this.config = {
      theme: 'dark',
      compactView: false,
      dateFormat: 'MM/DD/YYYY'
    };

    // Initialize the media query for system theme preference
    this.systemPreferenceMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPreferenceMediaQuery.addEventListener('change', this.handleSystemThemeChange);

    // Load stored configuration
    this.loadStoredConfig();
    
    // Apply initial theme
    this.applyTheme();
    this.applyCompactMode();
    this.applyDateFormat();
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  private loadStoredConfig(): void {
    try {
      const storedSettings = localStorage.getItem('phantomhub_settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        if (settings.theme) {
          this.config.theme = settings.theme;
        }
        if (settings.display) {
          this.config.compactView = settings.display.compactView;
          this.config.dateFormat = settings.display.dateFormat;
        }
      }
    } catch (error) {
      console.error('Error loading stored theme configuration:', error);
    }
  }

  private handleSystemThemeChange = (e: MediaQueryListEvent): void => {
    if (this.config.theme === 'system') {
      // Only re-apply the theme if we're using the system theme
      this.applyTheme();
    }
  };

  private applyTheme(): void {
    const root = document.documentElement;
    
    if (this.config.theme === 'system') {
      // Check system preference
      const prefersDark = this.systemPreferenceMediaQuery.matches;
      root.classList.toggle('light-theme', !prefersDark);
      root.classList.toggle('dark-theme', prefersDark);
    } else {
      root.classList.toggle('light-theme', this.config.theme === 'light');
      root.classList.toggle('dark-theme', this.config.theme === 'dark');
    }
    
    // Add CSS variables based on theme
    if (root.classList.contains('dark-theme')) {
      root.style.setProperty('--bg-primary', '#0f172a');
      root.style.setProperty('--bg-secondary', '#1e293b');
      root.style.setProperty('--text-primary', '#f8fafc');
      root.style.setProperty('--text-secondary', '#94a3b8');
    } else {
      root.style.setProperty('--bg-primary', '#f8fafc');
      root.style.setProperty('--bg-secondary', '#e2e8f0');
      root.style.setProperty('--text-primary', '#0f172a');
      root.style.setProperty('--text-secondary', '#64748b');
    }
  }

  private applyCompactMode(): void {
    const root = document.documentElement;
    root.classList.toggle('compact-ui', this.config.compactView);
    
    // Add compact mode CSS variables
    if (this.config.compactView) {
      root.style.setProperty('--space-y', '0.5rem');
      root.style.setProperty('--padding-container', '0.75rem');
      root.style.setProperty('--text-base-size', '0.875rem');
    } else {
      root.style.setProperty('--space-y', '1rem');
      root.style.setProperty('--padding-container', '1.5rem');
      root.style.setProperty('--text-base-size', '1rem');
    }
  }

  private applyDateFormat(): void {
    // Store the format for use by date formatting functions
    window.localStorage.setItem('date_format', this.config.dateFormat);
  }

  public setTheme(theme: ThemeType): void {
    this.config.theme = theme;
    this.applyTheme();
    this.notifyListeners();
  }

  public setCompactView(isCompact: boolean): void {
    this.config.compactView = isCompact;
    this.applyCompactMode();
    this.notifyListeners();
  }

  public setDateFormat(format: string): void {
    this.config.dateFormat = format;
    this.applyDateFormat();
    this.notifyListeners();
  }

  public getConfig(): ThemeConfig {
    return { ...this.config };
  }

  public addListener(listener: ThemeListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: ThemeListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const config = this.getConfig();
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        console.error('Error in theme listener:', error);
      }
    });
  }

  // Method to save theme changes to localStorage within the full settings object
  public saveToSettings(): void {
    try {
      const storedSettings = localStorage.getItem('phantomhub_settings');
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        settings.theme = this.config.theme;
        if (!settings.display) {
          settings.display = {};
        }
        settings.display.compactView = this.config.compactView;
        settings.display.dateFormat = this.config.dateFormat;
        localStorage.setItem('phantomhub_settings', JSON.stringify(settings));
      } else {
        // Create new settings object if none exists
        const newSettings = {
          theme: this.config.theme,
          display: {
            compactView: this.config.compactView,
            dateFormat: this.config.dateFormat,
            showAdvancedOptions: true
          }
        };
        localStorage.setItem('phantomhub_settings', JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error('Error saving theme settings to localStorage:', error);
    }
  }
}

export default ThemeService.getInstance(); 