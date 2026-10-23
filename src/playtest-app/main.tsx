import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/inter/400.css'
import '@fontsource/inter/700.css'
import '@/index.css'
import 'virtual:themes.css'
import '@/help/help.css'
import { APP_VERSION, PLAYTEST_NAME } from '@/app/appInfo'
import { initPwa } from '@/ui/pwa/pwa'
import { initTheme } from '@/ui/theme/theme'
import { App } from './App'

document.title = `${PLAYTEST_NAME} ${APP_VERSION}`
initTheme()
initPwa()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
