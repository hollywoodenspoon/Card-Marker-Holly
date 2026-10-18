import { Group, Rect, Text } from 'react-konva'
import type { ImageFieldElement, ImageValue } from '../../model/types'

export function ImageFieldNode({ el }: { el: ImageFieldElement; value: ImageValue }) {
  return (
    <Group>
      <Rect width={el.wMm} height={el.hMm} fill={el.placeholderColor} cornerRadius={el.radiusMm} />
      <Text
        width={el.wMm}
        height={el.hMm}
        text={el.name}
        align="center"
        verticalAlign="middle"
        fontFamily="Inter"
        fontSize={Math.min(4, el.hMm / 4)}
        fill="#7a7a85"
      />
    </Group>
  )
}
