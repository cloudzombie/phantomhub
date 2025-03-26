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
    return userId ? `ghostwire_settings_${userId}` : 'ghostwire_settings';
  }

  private loadStoredConfig(): void {
    try {
      // Get the settings key for the current user
      const settingsKey = this.getSettingsKey();
      console.log(`ThemeService: Loading configuration from localStorage key: ${settingsKey}`);
      
      // Get the settings from localStorage
      const storedSettings = localStorage.getItem(settingsKey);
      
      if (storedSettings) {
        console.log(`ThemeService: Found stored settings: ${storedSettings.substring(0, 100)}...`);
        
        // Try to parse the settings
        const settings = JSON.parse(storedSettings);
        
        // Update theme if present
        if (settings.theme) {
          console.log(`ThemeService: Updating theme from '${this.config.theme}' to '${settings.theme}'`);
          this.config.theme = settings.theme;
        } else {
          console.log(`ThemeService: No theme found in settings, keeping current theme: '${this.config.theme}'`);
        }
        
        // Update display settings if present
        if (settings.display) {
          if (settings.display.compactView !== undefined) {
            console.log(`ThemeService: Setting compactView to ${settings.display.compactView}`);
            this.config.compactView = settings.display.compactView;
          }
          
          if (settings.display.dateFormat) {
            console.log(`ThemeService: Setting dateFormat to ${settings.display.dateFormat}`);
            this.config.dateFormat = settings.display.dateFormat;
          }
        } else {
          console.log('ThemeService: No display settings found');
        }
      } else {
        console.log(`ThemeService: No stored settings found for key: ${settingsKey}`);
      }
    } catch (error) {
      console.error('Error loading stored theme configuration:', error);
    }
  }

  // Public method to explicitly reload settings and apply them
  public reloadSettings(): void {
    const currentTheme = this.config.theme;
    console.log(`ThemeService: Reloading settings for user - current theme before reload: '${currentTheme}'`);
    
    // Get the current settings key
    const settingsKey = this.getSettingsKey();
    console.log(`ThemeService: Using settings key: ${settingsKey}`);
    
    // Reload the configuration
    this.loadStoredConfig();
    
    // Log any theme change
    if (currentTheme !== this.config.theme) {
      console.log(`ThemeService: Theme changed from '${currentTheme}' to '${this.config.theme}' after reload`);
    } else {
      console.log(`ThemeService: Theme remained '${this.config.theme}' after reload`);
    }
    
    // Apply the reloaded settings
    this.applyTheme();
    this.applyCompactMode();
    this.applyDateFormat();
    
    // Notify listeners of changes
    this.notifyListeners();
    
    // Log the final state
    console.log(`ThemeService: Settings reload complete - current theme is now: '${this.config.theme}'`);
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
      console.log(`ThemeService: Saving theme '${this.config.theme}' to localStorage key: ${settingsKey}`);
      
      // Create a complete settings object that correctly includes all current theme settings
      const completeSettings = {
        theme: this.config.theme,
        display: {
          compactView: this.config.compactView,
          dateFormat: this.config.dateFormat,
          showAdvancedOptions: true
        }
      };
      
      // Try to merge with existing settings if they exist
      const storedSettings = localStorage.getItem(settingsKey);
      if (storedSettings) {
        try {
          const existingSettings = JSON.parse(storedSettings);
          
          // Merge the existing settings with our updated theme settings
          const mergedSettings = {
            ...existingSettings,
            theme: this.config.theme,
            display: {
              ...existingSettings.display,
              compactView: this.config.compactView,
              dateFormat: this.config.dateFormat
            }
          };
          
          // Save the merged settings
          localStorage.setItem(settingsKey, JSON.stringify(mergedSettings));
          console.log('ThemeService: Updated existing settings in localStorage', mergedSettings);
        } catch (parseError) {
          // If we can't parse existing settings, just save our complete settings
          localStorage.setItem(settingsKey, JSON.stringify(completeSettings));
          console.log('ThemeService: Created new settings in localStorage (parse error)', completeSettings);
        }
      } else {
        // No existing settings, create new ones
        localStorage.setItem(settingsKey, JSON.stringify(completeSettings));
        console.log('ThemeService: Created new settings in localStorage (no existing)', completeSettings);
      }
      
      // Double-check that the theme was saved correctly
      try {
        const checkSettings = localStorage.getItem(settingsKey);
        if (checkSettings) {
          const parsed = JSON.parse(checkSettings);
          console.log(`ThemeService: Verification - saved theme is now '${parsed.theme}'`);
        }
      } catch (e) {
        console.error('ThemeService: Verification failed', e);
      }
    } catch (error) {
      console.error('Error saving theme settings to localStorage:', error);
    }
  }

  // Force save the current theme to localStorage
  public forceSaveCurrentTheme(): void {
    try {
      const settingsKey = this.getSettingsKey();
      const currentTheme = this.config.theme;
      
      console.log(`ThemeService: Force saving current theme '${currentTheme}' to ${settingsKey}`);
      
      // Get existing settings or create new ones
      let settings: any = {};
      
      try {
        const stored = localStorage.getItem(settingsKey);
        if (stored) {
          settings = JSON.parse(stored);
        }
      } catch (e) {
        console.error('Error reading existing settings:', e);
      }
      
      // Ensure we have the required structure
      settings.theme = currentTheme;
      
      if (!settings.display) {
        settings.display = {};
      }
      
      settings.display.compactView = this.config.compactView;
      settings.display.dateFormat = this.config.dateFormat;
      
      // Save back to localStorage
      localStorage.setItem(settingsKey, JSON.stringify(settings));
      
      console.log(`ThemeService: Successfully force saved theme '${currentTheme}' to localStorage`);
      
      // Verify it worked
      try {
        const verification = localStorage.getItem(settingsKey);
        if (verification) {
          const parsed = JSON.parse(verification);
          console.log(`ThemeService: Verification - theme in localStorage is now '${parsed.theme}'`);
        }
      } catch (e) {
        console.error('ThemeService: Verification failed', e);
      }
    } catch (error) {
      console.error('Error force saving theme:', error);
    }
  }
}

export default ThemeService.getInstance(); 