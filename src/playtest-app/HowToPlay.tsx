import { useMemo } from 'react'
import { renderHelp } from '@/help/render'
import { Sheet } from '@/ui/components/ui/sheet'
import { useLayout } from '@/ui/shell/useLayout'
import guide from './guide.md?raw'

/** The Playtest app's guide (one page, the same Markdown style as Card Maker's Help). */
export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const phone = useLayout() === 'phone'
  const page = useMemo(
    () => renderHelp(guide.replace(/\r\n?/g, '\n'), `${import.meta.env.BASE_URL}help/`),
    [],
  )
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      side={phone ? 'bottom' : 'right'}
      title={page.title}
      tall
      className="md:w-[36rem]"
    >
      <article
        className="help-prose p-4"
        // The guide is our own Markdown; renderHelp escapes any raw HTML in it.
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </Sheet>
  )
}
