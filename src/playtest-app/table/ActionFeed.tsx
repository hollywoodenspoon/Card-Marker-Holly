import { SEATS, type Seat } from '@/adventure/state'
import { cn } from '@/lib/cn'
import { recentActions } from './activity'
import { shownRules, usePlaytest } from './usePlaytest'

/** Lines per player. */
const LINES = 4

/**
 * Each player's last few actions on the table itself, beside their half
 * (Player 2 at the top, Player 1 at the bottom), newest first and brightest.
 */
export function ActionFeed() {
  const shown = usePlaytest(shownRules)
  const setup = usePlaytest((s) => s.setup)
  if (!shown || !setup) return null
  const column = (seat: Seat) => {
    const lines = recentActions(shown, seat, LINES)
    if (!lines.length) return null
    return (
      <div
        className={cn(
          'pointer-events-none absolute left-2 z-[330] hidden w-56 flex-col gap-0.5 sm:flex',
          seat === 1 ? 'top-2' : 'bottom-14 flex-col-reverse',
        )}
        data-testid={`action-feed-${seat}`}
      >
        <span
          className="flex items-center gap-1 text-[11px] font-semibold text-white [text-shadow:0_1px_3px_black]"
          style={{ order: seat === 1 ? 0 : 99 }}
        >
          <span
            className="size-2 rounded-full"
            style={{ background: setup.seats[seat]?.color ?? '#64748b' }}
          />
          {shown.players[seat].name}
        </span>
        {lines.map((line, i) => (
          <span
            key={`${shown.log.length}-${i}`}
            className={cn(
              'truncate rounded px-1.5 py-0.5 text-xs text-white shadow',
              i === 0 && 'hs-pop font-semibold',
            )}
            style={{
              background: `color-mix(in oklab, ${setup.seats[seat]?.color ?? '#64748b'} 55%, black)`,
              opacity: 1 - i * 0.2,
            }}
          >
            {line}
          </span>
        ))}
      </div>
    )
  }
  return (
    <>
      {SEATS.map((seat) => (
        <span key={seat}>{column(seat)}</span>
      ))}
    </>
  )
}
