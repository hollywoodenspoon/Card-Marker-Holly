import { Trash2, Upload } from '@/ui/icons'
import { useMemo } from 'react'
import { BUILTIN_FONTS, unregisterFont } from '@/assets/fonts'
import { updateLibrary, useEditor } from '@/core/editor/editorStore'
import { uploadFonts } from '@/ui/actions/fontActions'
import { Button, IconButton } from '@/ui/components/ui/button'
import { askConfirm } from '@/ui/components/feedback'

export function FontsPanel() {
  const fonts = useEditor((s) => s.library.fonts)
  const list = useMemo(
    () =>
      Object.values(fonts).sort(
        (a, b) => a.family.localeCompare(b.family) || a.weight.localeCompare(b.weight),
      ),
    [fonts],
  )
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <div className="p-3">
        <Button variant="outline" className="w-full" onClick={uploadFonts}>
          <Upload /> Upload fonts
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          TTF or OTF. Upload each style (Regular, Bold, Italic…) of a family to use real bold and
          italics.
        </p>
      </div>
      <h3 className="px-4 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Your fonts
      </h3>
      {list.length ? (
        <ul className="px-2">
          {list.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-lg px-2 hover:bg-muted">
              <div className="min-w-0 flex-1 py-2">
                <div
                  className="truncate text-base"
                  style={{ fontFamily: `"${f.family}"`, fontWeight: f.weight, fontStyle: f.style }}
                >
                  {f.family}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {f.fileName} · {f.weight} {f.style !== 'normal' ? f.style : ''}
                </div>
              </div>
              <IconButton
                label={`Delete ${f.fileName}`}
                size="icon-sm"
                onClick={async () => {
                  // Fonts are not in the undo history, so ask first.
                  const ok = await askConfirm({
                    title: `Delete the font “${f.family}”?`,
                    description:
                      'Texts using it fall back to the default font. This cannot be undone.',
                    okLabel: 'Delete',
                    danger: true,
                  })
                  if (!ok) return
                  unregisterFont(f.id)
                  updateLibrary((l) => void delete l.fonts[f.id])
                }}
              >
                <Trash2 />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-2 text-sm text-muted-foreground">No uploaded fonts yet.</p>
      )}
      <h3 className="px-4 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Built in
      </h3>
      <ul className="px-4 pb-4">
        {BUILTIN_FONTS.map((f) => (
          <li key={f} className="py-1.5 text-base" style={{ fontFamily: `"${f}"` }}>
            {f}
          </li>
        ))}
      </ul>
    </div>
  )
}
