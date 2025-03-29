import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { Provider } from 'react-redux'
import { store } from './store'
import { RootStoreProvider } from './contexts/RootStoreContext'
import { WebSocketManager } from './core/WebSocketManager'
import { SOCKET_ENDPOINT } from './config/api'

// Import and initialize services
import NotificationService from './services/NotificationService'
import ThemeService from './services/ThemeService'

// Ensure services are initialized
console.log('Initializing core services...')

// Initialize theme
const themeConfig = ThemeService.getConfig()
console.log(`Theme initialized: ${themeConfig.theme}`)

// Make sure the theme class is applied to the document element
document.documentElement.classList.add(
  themeConfig.theme === 'system' 
  ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme'
  : themeConfig.theme === 'dark' ? 'dark-theme' : 'light-theme'
)

// Initialize WebSocket Manager
const wsManager = WebSocketManager.getInstance();
wsManager.connect(SOCKET_ENDPOINT);

// Add error boundary for the entire app
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <RootStoreProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </RootStoreProvider>
    </Provider>
  </React.StrictMode>,
)
