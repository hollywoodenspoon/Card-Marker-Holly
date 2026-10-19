import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/400-italic.css'
import '@fontsource/inter/700-italic.css'
import '@fontsource/alegreya/400.css'
import '@fontsource/alegreya/700.css'
import '@fontsource/alegreya/400-italic.css'
import '@fontsource/alegreya/700-italic.css'
import '@fontsource/alegreya-sc/400.css'
import '@fontsource/alegreya-sc/700.css'
import '@fontsource/alegreya-sc/400-italic.css'
import '@fontsource/alegreya-sc/700-italic.css'
import '@/index.css'
import { initPwa } from '@/ui/pwa/pwa'
import { initTheme } from '@/ui/theme/theme'
import { App } from './App'

initTheme()
initPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
