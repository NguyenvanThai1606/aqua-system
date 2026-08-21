import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CSS nền tảng phải nạp TRƯỚC App, vì App kéo theo CSS của từng component.
// Nếu đảo thứ tự, global.css sẽ đè lên style riêng của component.
import './styles/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
