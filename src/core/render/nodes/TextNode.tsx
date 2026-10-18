import { Text } from 'react-konva'
import type { TextElement, TextValue } from '../../model/types'
import { plainText } from '../../text/richtext'
import { ptToMm } from '../../units/units'

/** Simple text rendering; replaced by the rich-text layout engine. */
export function TextNode({ el, value }: { el: TextElement; value: TextValue }) {
  const s = el.baseStyle
  return (
    <Text
      width={el.wMm}
      height={el.hMm}
      padding={el.paddingMm}
      text={plainText(value.text)}
      fontFamily={s.fontFamily}
      fontSize={ptToMm(s.sizePt)}
      fontStyle={`${s.italic ? 'italic ' : ''}${s.bold ? 'bold' : 'normal'}`}
      textDecoration={s.underline ? 'underline' : ''}
      fill={s.color}
      align={el.align}
      verticalAlign={el.vAlign}
      lineHeight={el.lineHeight}
    />
  )
}
