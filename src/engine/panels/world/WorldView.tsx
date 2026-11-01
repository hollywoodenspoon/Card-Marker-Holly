import { useGame } from '../../store/gameStore'
import { BoosterView } from './BoosterView'
import { ActivityView, CalEventView, CalendarPreview } from './CalendarViews'
import { CharacterView } from './CharacterView'
import { PortraitView } from './PortraitView'
import { ShopView } from './ShopView'

/** The centre for characters, shops, boosters and the calendar. */
export function WorldView() {
  const view = useGame((s) => s.view)
  const game = useGame((s) => s.game)
  const id = 'id' in view ? view.id : ''
  switch (view.kind) {
    case 'portrait': {
      const t = game.portraits.find((x) => x.id === id)
      return t ? <PortraitView key={t.id} template={t} /> : gone
    }
    case 'character': {
      const c = game.characters.find((x) => x.id === id)
      return c ? <CharacterView key={c.id} character={c} /> : gone
    }
    case 'shop': {
      const s = game.shops.find((x) => x.id === id)
      return s ? <ShopView key={s.id} shop={s} /> : gone
    }
    case 'booster': {
      const b = game.boosters.find((x) => x.id === id)
      return b ? <BoosterView key={b.id} booster={b} /> : gone
    }
    case 'activity': {
      const a = game.calendar.activities.find((x) => x.id === id)
      return a ? <ActivityView key={a.id} activity={a} /> : gone
    }
    case 'calEvent': {
      const e = game.calendar.events.find((x) => x.id === id)
      return e ? <CalEventView key={e.id} event={e} /> : gone
    }
    case 'calendar':
      return <CalendarPreview />
    default:
      return gone
  }
}

const gone = (
  <p className="p-6 text-center text-sm text-muted-foreground">That is no longer in this game.</p>
)
