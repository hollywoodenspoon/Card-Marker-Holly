import { describe, expect, it } from 'vitest'
import { createProject } from './factories'
import { fieldNames } from './tree'

describe('createProject', () => {
  it('creates an 86 × 54 project with a front, a back, and one card', () => {
    const { project, templates, cards } = createProject('Test')
    expect(project.defaultSize).toMatchObject({ widthMm: 86, heightMm: 54 })
    expect(project.bleedMm).toBe(3)
    expect(project.print).toEqual({ paper: 'A4', marginMm: 5 })
    expect(templates.map((t) => t.side)).toEqual(['front', 'back'])
    expect(cards).toHaveLength(1)
    expect(cards[0].frontTemplateId).toBe(templates[0].id)
    expect(cards[0].backTemplateId).toBe(templates[1].id)
  })

  it('starter front has fields to fill in', () => {
    const { templates } = createProject()
    expect(fieldNames(templates[0].elements)).toEqual(['Art', 'Title', 'Rules'])
  })

  it('background covers the bleed area', () => {
    const { templates } = createProject()
    const bg = templates[0].elements[0]
    expect(bg).toMatchObject({ xMm: -3, yMm: -3, wMm: 92, hMm: 60 })
  })
})
