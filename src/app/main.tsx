import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/400-italic.css'
import '@fontsource/inter/700-italic.css'
import '@/index.css'
import { initTheme } from '@/ui/theme/theme'
import { App } from './App'

initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
