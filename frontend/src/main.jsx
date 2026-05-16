import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/v3-design.css'
import { PerfTier } from './components/ui/PerfTier'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PerfTier>
      <App />
    </PerfTier>
  </React.StrictMode>
)
