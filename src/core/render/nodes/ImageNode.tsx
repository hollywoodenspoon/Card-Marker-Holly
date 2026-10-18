import { Rect } from 'react-konva'
import type { ImageElement } from '../../model/types'

export function ImageNode({ el }: { el: ImageElement }) {
  return <Rect width={el.wMm} height={el.hMm} fill="#ccc" />
}
