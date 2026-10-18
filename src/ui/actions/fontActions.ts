import { FONT_ACCEPT, readFontFile, registerFont } from '@/assets/fonts'
import { updateLibrary, useEditor } from '@/core/editor/editorStore'
import { pickFiles } from './imageActions'

export async function uploadFonts() {
  const s = useEditor.getState()
  if (!s.doc) return
  const files = await pickFiles(FONT_ACCEPT)
  for (const f of files) {
    try {
      const font = await readFontFile(f, s.doc.project.id)
      if (await registerFont(font)) updateLibrary((l) => void (l.fonts[font.id] = font))
      else alert(`“${f.name}” could not be loaded as a font.`)
    } catch (e) {
      console.warn(e)
      alert(`“${f.name}” could not be read.`)
    }
  }
}
