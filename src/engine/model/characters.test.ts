import { describe, expect, it } from 'vitest'
import { newCharacter, newOption, newPortraitTemplate, portraitLayers } from './characters'

describe('portraits', () => {
  it('draws each layer’s chosen option, with expressions swapping some', () => {
    const t = newPortraitTemplate()
    const [skin, eyes, , , , hat] = t.layers
    skin.options.push(newOption('Skin', { store: 'game', id: 'skin' }))
    const round = newOption('Round', { store: 'game', id: 'eyes' })
    const happy = t.expressions[1]
    round.byExpression[happy.id] = { store: 'game', id: 'eyes-happy' }
    eyes.options.push(round)
    hat.options.push(newOption('Cap', { store: 'game', id: 'cap' }))
    const c = newCharacter('Ana', t)
    c.parts[skin.id].color = '#123456'
    // The accessory isn't required, so a new character has none.
    expect(portraitLayers(t, c).map((l) => l.image.id)).toEqual(['skin', 'eyes'])
    expect(portraitLayers(t, c, 'happy').map((l) => l.image.id)).toEqual(['skin', 'eyes-happy'])
    expect(portraitLayers(t, c, happy.id)[0]).toMatchObject({ recolor: 'ramp', color: '#123456' })
    c.parts[hat.id].option = hat.options[0].id
    expect(portraitLayers(t, c, 'Sad').map((l) => l.image.id)).toEqual(['skin', 'eyes', 'cap'])
  })
})
