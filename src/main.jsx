import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import RoomFlow from './RoomFlow.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RoomFlow />
  </StrictMode>,
)
