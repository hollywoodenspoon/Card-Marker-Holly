import { describe, expect, it } from 'vitest'
import { familyFromFileName } from './fonts'
import { styleFromSubfamily } from './fontName'

describe('font naming', () => {
  it('maps subfamily names to CSS descriptors', () => {
    expect(styleFromSubfamily('Regular')).toEqual({ weight: '400', style: 'normal' })
    expect(styleFromSubfamily('Bold Italic')).toEqual({ weight: '700', style: 'italic' })
    expect(styleFromSubfamily('SemiBold')).toEqual({ weight: '600', style: 'normal' })
    expect(styleFromSubfamily('ExtraBold')).toEqual({ weight: '800', style: 'normal' })
  })

  it('derives a family from the file name as a fallback', () => {
    expect(familyFromFileName('Cinzel-Bold.ttf')).toBe('Cinzel Bold')
    expect(familyFromFileName('MyFont_Regular.otf')).toBe('My Font Regular')
  })
})
