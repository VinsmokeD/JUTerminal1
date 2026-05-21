import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './styles/v3-design.css'
import { PerfTier } from './components/ui/PerfTier'

window.onerror = function(msg, url, line, col) {
  window.alert("Global Error: " + msg + "\nAt: " + url + ":" + line + ":" + col);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <PerfTier>
    <App />
  </PerfTier>
)
