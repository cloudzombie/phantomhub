import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'

// Import and initialize services
import ApiService from './services/ApiService'
import NotificationService from './services/NotificationService'
import ThemeService from './services/ThemeService'

// Ensure services are initialized
console.log('Initializing core services...')
const apiConfig = ApiService.getConfig()
console.log(`API endpoint configured at: ${apiConfig.endpoint}`)

// Initialize theme
const themeConfig = ThemeService.getConfig()
console.log(`Theme initialized: ${themeConfig.theme}`)

// Make sure the theme class is applied to the document element
document.documentElement.classList.add(
  themeConfig.theme === 'system' 
  ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme'
  : themeConfig.theme === 'dark' ? 'dark-theme' : 'light-theme'
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
