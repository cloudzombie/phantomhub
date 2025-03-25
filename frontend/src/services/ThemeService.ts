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

  private getCurrentUserId(): string | null {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || null;
      }
    } catch (error) {
      console.error('Error getting current user ID:', error);
    }
    return null;
  }

  private getSettingsKey(): string {
    const userId = this.getCurrentUserId();
    return userId ? `phantomhub_settings_${userId}` : 'phantomhub_settings';
  }

  private loadStoredConfig(): void {
    try {
      const storedSettings = localStorage.getItem(this.getSettingsKey());
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

  // Public method to explicitly reload settings and apply them
  public reloadSettings(): void {
    console.log('ThemeService: Reloading settings for user');
    // Reload the configuration
    this.loadStoredConfig();
    
    // Apply the reloaded settings
    this.applyTheme();
    this.applyCompactMode();
    this.applyDateFormat();
    
    // Notify listeners of changes
    this.notifyListeners();
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
      root.classList.remove('light-theme', 'dark-theme');
      root.classList.add(prefersDark ? 'dark-theme' : 'light-theme');
    } else {
      root.classList.remove('light-theme', 'dark-theme');
      root.classList.add(this.config.theme === 'light' ? 'light-theme' : 'dark-theme');
    }
    
    // Log the theme change for debugging
    console.log('Theme applied:', root.classList.contains('dark-theme') ? 'dark' : 'light');
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
      const settingsKey = this.getSettingsKey();
      const storedSettings = localStorage.getItem(settingsKey);
      if (storedSettings) {
        const settings = JSON.parse(storedSettings);
        settings.theme = this.config.theme;
        if (!settings.display) {
          settings.display = {};
        }
        settings.display.compactView = this.config.compactView;
        settings.display.dateFormat = this.config.dateFormat;
        localStorage.setItem(settingsKey, JSON.stringify(settings));
        console.log('ThemeService: Saved theme settings to localStorage', settings);
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
        localStorage.setItem(settingsKey, JSON.stringify(newSettings));
        console.log('ThemeService: Created new settings in localStorage', newSettings);
      }
    } catch (error) {
      console.error('Error saving theme settings to localStorage:', error);
    }
  }
}

export default ThemeService.getInstance(); 