/** The league's view of a card: just what the rules need. */
export interface LCard {
  id: string
  name: string
  ace: boolean
  fields: Record<string, string | number>
}

export const fieldText = (c: LCard, key: string) => String(c.fields[key] ?? '').trim()
