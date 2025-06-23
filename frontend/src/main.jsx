import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { logTestResults } from './utils/test-setup'

// Run environment setup tests
logTestResults();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)