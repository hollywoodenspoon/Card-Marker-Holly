import { describe, expect, it } from 'vitest'
import { addShape, flipSelection, selectedItems, selectionBounds } from './actions'
import { newDoc } from './model'
import { loadVectorDoc, useVector } from './store'

describe('flipSelection', () => {
  it('mirrors in place, about the middle of the selection', () => {
    loadVectorDoc(newDoc())
    // A right triangle: its corner on the left, so a flip moves it to the right.
    addShape('triangle', { x: 100, y: 50, w: 200, h: 100 })
    const before = selectionBounds()!
    const xs = () => selectedItems()[0].subpaths[0].anchors.map((a) => Math.round(a.x))
    const ys = () => selectedItems()[0].subpaths[0].anchors.map((a) => Math.round(a.y))
    const x0 = xs()
    const y0 = ys()
    flipSelection('horizontal')
    expect(selectionBounds()).toEqual(before)
    expect(xs()).toEqual(x0.map((x) => 400 - x))
    expect(ys()).toEqual(y0)
    flipSelection('vertical')
    expect(ys()).toEqual(y0.map((y) => 200 - y))
    // Each flip is one undo step.
    expect(useVector.getState().past.length).toBeGreaterThanOrEqual(3)
  })

  it('does nothing without a selection', () => {
    loadVectorDoc(newDoc())
    expect(() => flipSelection('vertical')).not.toThrow()
  })
})
