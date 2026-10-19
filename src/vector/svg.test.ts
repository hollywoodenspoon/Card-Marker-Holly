// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { area, bounds } from './geometry'
import { newDoc, newLayer, newPath } from './model'
import { buildShape } from './shapes'
import { fromSvg, toSvg } from './svg'

describe('svg export and import', () => {
  it('round-trips layers, paths and styles', () => {
    const doc = newDoc(300, 200)
    doc.layers[0].items.push(newPath('Star', buildShape('star', { x: 10, y: 10, w: 100, h: 100 })))
    const top = newLayer('Details')
    top.opacity = 0.5
    top.items.push(
      newPath('Ring', buildShape('ring', { x: 150, y: 50, w: 80, h: 80 }), {
        fill: '#ff69b4',
        stroke: '#069494',
        strokeWidth: 4,
        opacity: 0.8,
      }),
    )
    doc.layers.push(top)
    const back = fromSvg(toSvg(doc))
    expect([back.width, back.height]).toEqual([300, 200])
    expect(back.layers.map((l) => l.name)).toEqual(['Layer 1', 'Details'])
    expect(back.layers[1].opacity).toBe(0.5)
    const ring = back.layers[1].items[0]
    expect(ring.name).toBe('Ring')
    expect(ring.style).toMatchObject({
      fill: '#ff69b4',
      stroke: '#069494',
      strokeWidth: 4,
      opacity: 0.8,
    })
    expect(ring.subpaths).toHaveLength(2)
    const star = back.layers[0].items[0]
    expect(area(star.subpaths)).toBeCloseTo(area(doc.layers[0].items[0].subpaths), 1)
  })

  it('reads basic shapes, groups, transforms and the viewBox', () => {
    const doc = fromSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="10 10 100 100">
      <rect x="10" y="10" width="20" height="10" fill="red"/>
      <g id="icons" transform="translate(50 0)" fill="#00f">
        <circle cx="20" cy="30" r="5"/>
        <polygon points="10,10 20,10 15,20" style="fill: rgb(0, 128, 0)"/>
        <text>skipped</text>
      </g>
    </svg>`)
    expect([doc.width, doc.height]).toEqual([100, 100])
    expect(doc.layers.map((l) => [l.name, l.items.length])).toEqual([
      ['Layer 1', 1],
      ['icons', 2],
    ])
    const r = bounds(doc.layers[0].items[0].subpaths)
    expect([r.x, r.y, r.w, r.h].map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 20, 10])
    expect(doc.layers[0].items[0].style.fill).toBe('red')
    const c = bounds(doc.layers[1].items[0].subpaths)
    expect(c.x).toBeCloseTo(55)
    expect(doc.layers[1].items[0].style.fill).toBe('#0000ff')
    expect(doc.layers[1].items[1].style.fill).toBe('#008000')
    expect(() => fromSvg('<html></html>')).toThrow()
  })
})
