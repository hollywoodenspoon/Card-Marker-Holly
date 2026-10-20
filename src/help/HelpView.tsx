import { ArrowLeft, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'
import { useBackHandler, useEscapeToClose } from '@/ui/components/overlay'
import { IconButton } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { useLayout } from '@/ui/shell/useLayout'
import { useUi } from '@/ui/uiStore'
import { rememberHelpTopic } from './openHelp'
import { pageSource } from './pages'
import { renderHelp } from './render'
import { searchHelp } from './search'
import { HELP_SECTIONS, HELP_TOPICS } from './topics'
import './help.css'

const IMAGE_BASE = `${import.meta.env.BASE_URL}help/`

/** The in-app guide: topics on the left (a list on phones), the page on the right. */
export default function HelpView() {
  const help = useUi((s) => s.help)!
  const setHelp = useUi((s) => s.setHelp)
  const phone = useLayout() === 'phone'
  const [q, setQ] = useState('')
  // On phones the list and the page take turns.
  const [showList, setShowList] = useState(false)
  const article = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLElement>(null)

  const topic = HELP_TOPICS.find((t) => t.id === help.topic) ?? HELP_TOPICS[0]
  const index = HELP_TOPICS.indexOf(topic)
  const page = useMemo(
    () => renderHelp(pageSource(topic.id) ?? `# ${topic.title}`, IMAGE_BASE),
    [topic],
  )
  const hits = useMemo(() => searchHelp(q, HELP_TOPICS, pageSource), [q])

  const close = () => setHelp(null)
  useEscapeToClose(close)
  useBackHandler(() => (phone && showList ? setShowList(false) : close()))

  const go = (id: string, anchor?: string) => {
    setHelp({ topic: id, anchor })
    setShowList(false)
  }

  useEffect(() => {
    rememberHelpTopic(topic.id)
    listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
    const el = article.current
    if (!el) return
    const target = help.anchor ? el.querySelector(`#${CSS.escape(help.anchor)}`) : null
    if (target) target.scrollIntoView({ block: 'start' })
    else el.scrollTop = 0
  }, [topic.id, help.anchor])

  // Links between pages stay inside Help.
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a[data-help]') as HTMLAnchorElement | null
    if (!a) return
    e.preventDefault()
    go(a.dataset.help!, a.dataset.anchor)
  }

  const list = (
    <nav aria-label="Help topics" className="flex flex-col gap-4 p-3">
      {q.trim() ? (
        hits.length ? (
          <ul className="flex flex-col gap-1">
            {hits.map((h) => (
              <li key={h.topic.id}>
                <button
                  type="button"
                  onClick={() => go(h.topic.id)}
                  className="flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-muted"
                >
                  <span className="text-sm font-medium">{h.topic.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{h.snippet}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 text-sm text-muted-foreground">Nothing found for “{q.trim()}”.</p>
        )
      ) : (
        HELP_SECTIONS.map((section) => (
          <div key={section}>
            <div className="px-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {section}
            </div>
            <ul>
              {HELP_TOPICS.filter((t) => t.section === section).map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => go(t.id)}
                    aria-current={t.id === topic.id ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 w-full items-center rounded-md px-2 text-left text-sm md:min-h-8',
                      t.id === topic.id
                        ? 'bg-accent-soft font-medium text-accent'
                        : 'hover:bg-muted',
                    )}
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </nav>
  )

  const prev = HELP_TOPICS[index - 1]
  const next = HELP_TOPICS[index + 1]
  const listVisible = !phone || showList || !!q.trim()

  return (
    <div
      className="h-app pt-safe pb-safe fixed inset-0 z-[70] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Help"
    >
      <header className="flex shrink-0 items-center gap-2 border-b bg-panel px-2 py-2">
        <IconButton label="Close help" onClick={close}>
          <ArrowLeft />
        </IconButton>
        <div className="mr-2 text-sm font-semibold">Help</div>
        <div className="relative min-w-0 flex-1 sm:max-w-72">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pr-8 pl-8"
            placeholder="Search help"
            aria-label="Search help"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ('')}
              className="absolute top-1/2 right-1 grid size-8 -translate-y-1/2 place-items-center text-muted-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        {listVisible && (
          <aside
            ref={listRef}
            className={cn(
              'min-h-0 overflow-y-auto border-r bg-panel',
              phone ? 'w-full border-r-0' : 'w-64 shrink-0',
            )}
          >
            {list}
          </aside>
        )}
        {(!phone || !listVisible) && (
          <main ref={article} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-5xl gap-8 px-4 py-6 md:px-8">
              <article className="min-w-0 flex-1" onClick={onClick}>
                {phone && (
                  <button
                    type="button"
                    onClick={() => setShowList(true)}
                    className="mb-3 flex min-h-11 items-center gap-1 text-sm text-accent"
                  >
                    <ChevronLeft className="size-4" /> All topics
                  </button>
                )}
                <div className="text-xs font-medium text-muted-foreground">{topic.section}</div>
                <h1 className="mb-4 text-2xl font-semibold">{page.title || topic.title}</h1>
                <div className="help-prose" dangerouslySetInnerHTML={{ __html: page.html }} />
                <div className="mt-10 flex flex-wrap justify-between gap-3 border-t pt-4">
                  {prev ? (
                    <button
                      type="button"
                      onClick={() => go(prev.id)}
                      className="flex min-h-11 items-center gap-1 text-left text-sm"
                    >
                      <ChevronLeft className="size-4 shrink-0" />
                      <span>
                        <span className="block text-xs text-muted-foreground">Previous</span>
                        {prev.title}
                      </span>
                    </button>
                  ) : (
                    <span />
                  )}
                  {next && (
                    <button
                      type="button"
                      onClick={() => go(next.id)}
                      className="ml-auto flex min-h-11 items-center gap-1 text-right text-sm"
                    >
                      <span>
                        <span className="block text-xs text-muted-foreground">Next</span>
                        {next.title}
                      </span>
                      <ChevronRight className="size-4 shrink-0" />
                    </button>
                  )}
                </div>
              </article>
              {page.headings.length > 1 && (
                <nav aria-label="On this page" className="hidden w-48 shrink-0 xl:block">
                  <div className="sticky top-0 flex flex-col gap-1 text-sm">
                    <div className="pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      On this page
                    </div>
                    {page.headings.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => go(topic.id, h.id)}
                        className="text-left text-muted-foreground hover:text-foreground"
                      >
                        {h.text}
                      </button>
                    ))}
                  </div>
                </nav>
              )}
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
