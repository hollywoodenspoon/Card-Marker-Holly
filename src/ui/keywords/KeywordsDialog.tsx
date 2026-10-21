import { Bold, Italic, Plus, Trash2, Underline } from '@/ui/icons'
import { useEditor } from '@/core/editor/editorStore'
import { newId } from '@/core/model/ids'
import type { Keyword, TextStyle } from '@/core/model/types'
import { cn } from '@/lib/cn'
import { setKeywords } from '@/templates/keywordCommands'
import { Button, IconButton } from '@/ui/components/ui/button'
import { Dialog, DialogContent } from '@/ui/components/ui/dialog'
import { Input, NativeSelect } from '@/ui/components/ui/input'
import { useUi } from '@/ui/uiStore'
import { useFontFamilies } from '@/ui/text/useFontFamilies'

/** Project keywords: words styled automatically in every card text. */
export function KeywordsDialog() {
  const open = useUi((s) => s.keywordsOpen)
  const close = () => useUi.getState().setKeywordsOpen(false)
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        title="Keywords"
        description="Words and phrases styled automatically wherever they appear in card text (any capitals, whole words only)."
        className="max-w-xl"
      >
        {open && <KeywordList />}
      </DialogContent>
    </Dialog>
  )
}

const NO_KEYWORDS: Keyword[] = []

function KeywordList() {
  const keywords = useEditor((s) => s.doc!.project.keywords) ?? NO_KEYWORDS
  const families = useFontFamilies()
  const update = (id: string, patch: Partial<Keyword>, coalesce?: string) =>
    setKeywords(
      keywords.map((k) => (k.id === id ? { ...k, ...patch } : k)),
      coalesce,
    )
  const style = (k: Keyword, patch: Partial<TextStyle>) => {
    const next: Partial<TextStyle> = { ...k.style, ...patch }
    for (const key of Object.keys(next) as (keyof TextStyle)[])
      if (next[key] === undefined || next[key] === false) delete next[key]
    update(k.id, { style: next })
  }
  const add = () => setKeywords([...keywords, { id: newId(), word: '', style: { bold: true } }])

  return (
    <div className="flex flex-col gap-3">
      {keywords.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No keywords yet. Add words like “Flying” or “Deal damage” to make them stand out on every
          card.
        </p>
      )}
      <ul className="flex flex-col gap-2" aria-label="Keywords">
        {keywords.map((k) => (
          <li
            key={k.id}
            className="flex flex-col gap-1.5 rounded-lg border p-2"
            data-testid="keyword"
          >
            <div className="flex items-center gap-1.5">
              <Input
                aria-label="Keyword"
                placeholder="Word or phrase"
                value={k.word}
                onChange={(e) => update(k.id, { word: e.target.value }, `kw:${k.id}`)}
                className="flex-1"
              />
              <IconButton
                label={`Delete keyword ${k.word}`}
                onClick={() => setKeywords(keywords.filter((x) => x.id !== k.id))}
              >
                <Trash2 />
              </IconButton>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  ['bold', Bold],
                  ['italic', Italic],
                  ['underline', Underline],
                ] as const
              ).map(([key, Icon]) => (
                <IconButton
                  key={key}
                  label={key[0].toUpperCase() + key.slice(1)}
                  size="icon-sm"
                  aria-pressed={!!k.style[key]}
                  className={cn(k.style[key] && 'bg-accent-soft text-accent')}
                  onClick={() => style(k, { [key]: !k.style[key] })}
                >
                  <Icon />
                </IconButton>
              ))}
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="color"
                  aria-label="Keyword colour"
                  className="size-8 cursor-pointer rounded border md:size-6"
                  value={k.style.color ?? '#000000'}
                  onChange={(e) => style(k, { color: e.target.value })}
                />
                {k.style.color ? (
                  <button
                    type="button"
                    className="underline"
                    onClick={() => style(k, { color: undefined })}
                  >
                    no colour
                  </button>
                ) : (
                  'colour'
                )}
              </label>
              <NativeSelect
                aria-label="Font"
                className="w-auto min-w-28 flex-1"
                value={k.style.fontFamily ?? ''}
                onChange={(e) => style(k, { fontFamily: e.target.value || undefined })}
              >
                <option value="">Same font</option>
                {families.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </NativeSelect>
            </div>
            {k.word.trim() && (
              <p className="text-sm">
                Sample:{' '}
                <span
                  style={{
                    fontWeight: k.style.bold ? 700 : undefined,
                    fontStyle: k.style.italic ? 'italic' : undefined,
                    textDecoration: k.style.underline ? 'underline' : undefined,
                    color: k.style.color,
                    fontFamily: k.style.fontFamily,
                  }}
                >
                  {k.word}
                </span>{' '}
                lets this creature attack.
              </p>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={add}>
          <Plus /> Add keyword
        </Button>
        <p className="text-xs text-muted-foreground">Text parts can opt out in Text properties.</p>
      </div>
    </div>
  )
}
