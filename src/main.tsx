import { StrictMode } from 'react'
import { loadSettings } from './lib/settings'
import { applyTheme } from './lib/theme'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

registerSW({ immediate: true })

applyTheme(loadSettings().themeId)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
