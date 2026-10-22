import type { TournamentSpec } from '@/adventure/tournament/tournament'

/** A format in words, e.g. "16 players · 3 rounds of Swiss, then a top 4 knockout · Best of 1". */
export function describeSpec(spec: TournamentSpec): string {
  const parts = spec.stages.map((s) => {
    if (s.kind === 'swiss') return `${s.rounds ?? 3} rounds of Swiss`
    if (s.kind === 'groups')
      return `${s.groups} groups, round robin, top ${s.advance ?? 1} of each go on`
    if (s.kind === 'knockout') return `a top ${s.advance ?? spec.players} knockout`
    return 'round robin'
  })
  const bestOf = [...new Set(spec.stages.map((s) => s.bestOf))]
  const finals = spec.stages.flatMap((s) =>
    s.finalBestOf && s.finalBestOf !== s.bestOf ? [s.finalBestOf] : [],
  )
  const length =
    bestOf.map((n) => `best of ${n}`).join(' or ') +
    (finals.length ? `, final best of ${finals[0]}` : '')
  return `${spec.players} players · ${parts.join(', then ')} · ${length}`
}
