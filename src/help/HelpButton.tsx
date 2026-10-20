import { CircleHelp } from 'lucide-react'
import { IconButton } from '@/ui/components/ui/button'
import { openHelp } from './openHelp'

/** A small "?" that opens Help at the page about this screen. */
export function HelpButton({ topic, className }: { topic: string; className?: string }) {
  return (
    <IconButton label="Help" className={className} onClick={() => openHelp(topic)}>
      <CircleHelp />
    </IconButton>
  )
}
