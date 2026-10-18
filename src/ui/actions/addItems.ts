import { Circle, ImagePlus, Minus, Square, Type } from 'lucide-react'
import { addImageField, addShape, addText } from './addActions'

export const ADD_ITEMS = [
  { id: 'text', label: 'Text', icon: Type, run: addText },
  { id: 'imageField', label: 'Image field (art box)', icon: ImagePlus, run: addImageField },
  { id: 'rect', label: 'Rectangle', icon: Square, run: () => addShape('rect') },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, run: () => addShape('ellipse') },
  { id: 'line', label: 'Line', icon: Minus, run: () => addShape('line') },
] as const
