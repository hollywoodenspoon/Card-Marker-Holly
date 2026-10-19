import {
  ChevronDown,
  FolderPlus,
  LayoutGrid,
  ImageDown,
  Printer,
  Sheet,
  Highlighter,
  Upload,
} from 'lucide-react'
import { useEditor } from '@/core/editor/editorStore'
import { cn } from '@/lib/cn'
import { IconButton } from '@/ui/components/ui/button'
import { useUi } from '@/ui/uiStore'
import { newAssetFolder, uploadImages } from '@/ui/actions/assetFolders'
import { AssetGroups } from './AssetsPanel'
import { ASSETS_ICON, LEFT_PANELS, type PanelId } from './panelIds'
import { PanelBody } from './PanelBody'

const ACTIONS = [
  {
    label: 'Print',
    title: 'Print and export PDF',
    icon: Printer,
    run: () => useUi.getState().setPrintOpen(true),
  },
  {
    label: 'Gallery',
    title: 'Gallery and proofreading',
    icon: LayoutGrid,
    run: () => useUi.getState().setGalleryOpen(true),
  },
  {
    label: 'Images',
    title: 'Export card images',
    icon: ImageDown,
    run: () => useUi.getState().setImageExport({ cardId: useEditor.getState().view.cardId }),
  },
  {
    label: 'Keywords',
    title: 'Keywords',
    icon: Highlighter,
    run: () => useUi.getState().setKeywordsOpen(true),
  },
  {
    label: 'Data',
    title: 'Card data: table, CSV export and mail merge',
    icon: Sheet,
    run: () => useUi.getState().setDataView('table'),
  },
]

const railButton =
  'flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted'

/** Vertical icon rail + the active panel, with Assets docked below. Used on desktop and inside the tablet drawer. */
export function LeftPanel({
  tab,
  onTab,
  className,
}: {
  tab: PanelId
  onTab: (t: PanelId) => void
  className?: string
}) {
  // A tab that left the rail (Assets, from older sessions) falls back to Cards.
  const shown = LEFT_PANELS.some((p) => p.id === tab) ? tab : 'cards'
  return (
    <div className={cn('flex min-h-0', className)}>
      <nav
        aria-label="Panels"
        className="flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r py-2"
      >
        {LEFT_PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onTab(p.id)}
            aria-pressed={shown === p.id}
            className={cn(
              railButton,
              shown === p.id && 'bg-accent-soft text-accent hover:bg-accent-soft',
            )}
          >
            <p.icon className="size-5" />
            {p.label}
          </button>
        ))}
        <div className="my-1 h-px w-10 shrink-0 bg-border" role="separator" />
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.run}
            title={a.title}
            className={railButton}
          >
            <a.icon className="size-5" />
            {a.label}
          </button>
        ))}
      </nav>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col">
          <PanelBody id={shown} />
        </div>
        <AssetsDock />
      </div>
    </div>
  )
}

/** Assets, always at hand at the bottom of the left pane (collapsible, like Layers). */
function AssetsDock() {
  const open = useUi((s) => s.assetsOpen)
  const setOpen = useUi((s) => s.setAssetsOpen)
  const count = useEditor((s) => Object.keys(s.library.assets).length)
  const Icon = ASSETS_ICON
  return (
    <section
      aria-label="Assets"
      className={cn('flex min-h-0 shrink-0 flex-col border-t', open && 'h-[45%]')}
    >
      <div className="flex h-11 shrink-0 items-center gap-1 pr-2 md:h-10">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex h-full min-w-0 flex-1 items-center gap-2 pl-4 text-left"
        >
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Assets
          </span>
          <span className="text-xs text-muted-foreground">· {count}</span>
          <span className="flex-1" />
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              !open && 'rotate-180',
            )}
          />
        </button>
        <IconButton label="New folder" size="icon-sm" onClick={newAssetFolder}>
          <FolderPlus />
        </IconButton>
        <IconButton label="Upload images" size="icon-sm" onClick={() => uploadImages()}>
          <Upload />
        </IconButton>
      </div>
      {open && <AssetGroups compact />}
    </section>
  )
}
