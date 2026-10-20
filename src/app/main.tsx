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
import { assetResolver } from '@/assets/assetResolver'
import { useEditor } from '@/core/editor/editorStore'
import { initPwa } from '@/ui/pwa/pwa'
import { initTheme } from '@/ui/theme/theme'
import { App } from './App'

initTheme()
initPwa()
// The canvas and thumbnails decode pictures through one resolver: keep its asset list current.
assetResolver.setAssets(useEditor.getState().library.assets)
useEditor.subscribe((s, prev) => {
  if (s.library.assets !== prev.library.assets) assetResolver.setAssets(s.library.assets)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
