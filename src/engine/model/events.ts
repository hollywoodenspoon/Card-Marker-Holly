/**
 * Cause and Effect: the engine's core way of making anything happen. An event is a
 * cause ("when the player clicks Shop door") and a list of steps run in order.
 * A step is an effect, or a branch holding more steps (if/otherwise, a choice, a
 * random pick), nested as deep as needed. Causes, conditions and effects are named
 * pieces from a registry (src/engine/events/pieces.ts), so modules add their own
 * without touching this model. Pure data, no UI.
 */
import { newId } from '@/core/model/ids'

/** A piece's settings: ids of things in the game, numbers, text, booleans. */
export type Args = Record<string, string | number | boolean | undefined>

/** "When…": a cause piece and its settings. */
export interface Cause {
  piece: string
  args: Args
}

/** "Only if…": a condition piece. */
export interface Condition {
  piece: string
  args: Args
}

export interface EffectStep {
  kind: 'effect'
  id: string
  piece: string
  args: Args
}

export interface IfStep {
  kind: 'if'
  id: string
  condition: Condition
  then: Step[]
  else: Step[]
}

export interface ChoiceStep {
  kind: 'choice'
  id: string
  prompt: string
  options: { id: string; label: string; steps: Step[] }[]
}

export interface RandomStep {
  kind: 'random'
  id: string
  branches: { id: string; weight: number; steps: Step[] }[]
}

export type Step = EffectStep | IfStep | ChoiceStep | RandomStep

export interface GameEvent {
  id: string
  cause: Cause
  steps: Step[]
}

/** Saved steps to reuse anywhere ("Locked door with key"). */
export interface Recipe {
  id: string
  name: string
  steps: Step[]
}

export const effect = (piece: string, args: Args = {}): EffectStep => ({
  kind: 'effect',
  id: newId(),
  piece,
  args,
})

export const ifStep = (
  condition: Condition,
  then: Step[] = [],
  otherwise: Step[] = [],
): IfStep => ({
  kind: 'if',
  id: newId(),
  condition,
  then,
  else: otherwise,
})

export const choiceStep = (prompt: string, labels: string[]): ChoiceStep => ({
  kind: 'choice',
  id: newId(),
  prompt,
  options: labels.map((label) => ({ id: newId(), label, steps: [] })),
})

export const randomStep = (weights: number[] = [1, 1]): RandomStep => ({
  kind: 'random',
  id: newId(),
  branches: weights.map((weight) => ({ id: newId(), weight, steps: [] })),
})

export const newEvent = (cause: Cause): GameEvent => ({ id: newId(), cause, steps: [] })

/** The step lists inside a step (its branches), for walking the tree. */
export function childLists(s: Step): Step[][] {
  if (s.kind === 'if') return [s.then, s.else]
  if (s.kind === 'choice') return s.options.map((o) => o.steps)
  if (s.kind === 'random') return s.branches.map((b) => b.steps)
  return []
}

/** Every step in a tree, depth first. */
export function* walkSteps(steps: Step[]): Generator<Step> {
  for (const s of steps) {
    yield s
    for (const list of childLists(s)) yield* walkSteps(list)
  }
}

/** Finds the list holding a step (for editing in place), and its index there. */
export function findStep(steps: Step[], id: string): { list: Step[]; index: number } | null {
  const i = steps.findIndex((s) => s.id === id)
  if (i >= 0) return { list: steps, index: i }
  for (const s of steps)
    for (const list of childLists(s)) {
      const hit = findStep(list, id)
      if (hit) return hit
    }
  return null
}

/** A deep copy with fresh ids (duplicate a step, drop a recipe in). */
export function cloneSteps(steps: Step[]): Step[] {
  return steps.map((s): Step => {
    if (s.kind === 'effect') return { ...s, id: newId(), args: { ...s.args } }
    if (s.kind === 'if')
      return {
        ...s,
        id: newId(),
        condition: { ...s.condition, args: { ...s.condition.args } },
        then: cloneSteps(s.then),
        else: cloneSteps(s.else),
      }
    if (s.kind === 'choice')
      return {
        ...s,
        id: newId(),
        options: s.options.map((o) => ({ ...o, id: newId(), steps: cloneSteps(o.steps) })),
      }
    return {
      ...s,
      id: newId(),
      branches: s.branches.map((b) => ({ ...b, id: newId(), steps: cloneSteps(b.steps) })),
    }
  })
}
