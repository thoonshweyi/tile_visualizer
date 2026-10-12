import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import MaskPicker from './MaskPicker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MaskPicker apiUrl={import.meta.env.VITE_MASK_API_URL || '/api/mask'} />
  </StrictMode>,
)
