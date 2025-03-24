import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './App.css'

// Import and initialize services
import ApiService from './services/ApiService'
import NotificationService from './services/NotificationService'

// Ensure services are initialized
console.log('Initializing core services...')
const apiConfig = ApiService.getConfig()
console.log(`API endpoint configured at: ${apiConfig.endpoint}`)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
