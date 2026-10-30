/**
 * Runs Cause and Effect steps in order: effects one after another (waiting for the
 * ones that wait: a message, a choice, a card game), and branches by their kind.
 * Unknown pieces are skipped, so a game made with a module still opens without it.
 */
import type { Recipe, Step } from '../model/events'
import { piece, type RunContext } from './pieces'

export async function runSteps(steps: Step[], ctx: RunContext): Promise<void> {
  for (const s of steps) {
    if (ctx.stopped()) return
    if (s.kind === 'effect') {
      const def = piece(s.piece)
      if (def?.kind === 'effect') await def.run(ctx, s.args)
    } else if (s.kind === 'if') {
      const def = piece(s.condition.piece)
      const ok = def?.kind === 'condition' ? def.test(ctx, s.condition.args) : false
      await runSteps(ok ? s.then : s.else, ctx)
    } else if (s.kind === 'choice') {
      if (!s.options.length) continue
      const i = await ctx.choose(
        s.prompt,
        s.options.map((o) => o.label),
      )
      await runSteps(s.options[i]?.steps ?? [], ctx)
    } else if (s.kind === 'random') {
      const total = s.branches.reduce((n, b) => n + Math.max(0, b.weight), 0)
      if (total <= 0) continue
      let r = ctx.random() * total
      const hit = s.branches.find((b) => (r -= Math.max(0, b.weight)) < 0) ?? s.branches.at(-1)
      await runSteps(hit?.steps ?? [], ctx)
    }
  }
}

/** A runRecipe for a context: recipes calling recipes, stopping a loop that never ends. */
export function recipeRunner(recipes: Recipe[], ctx: () => RunContext, maxDepth = 32) {
  let depth = 0
  return async (id: string) => {
    const r = recipes.find((x) => x.id === id)
    if (!r || depth >= maxDepth) return
    depth++
    try {
      await runSteps(r.steps, ctx())
    } finally {
      depth--
    }
  }
}
