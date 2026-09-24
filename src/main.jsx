import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import TileVisualizer from './TileVisualizer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TileVisualizer />
  </StrictMode>,
)
