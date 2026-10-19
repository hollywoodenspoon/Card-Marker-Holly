import { Circle, Hash, Image, ImagePlus, Minus, Rows3, Square, Type } from 'lucide-react'
import { IMAGE_ACCEPT } from '@/assets/imageAssets'
import { addCardNumber, addIconRow, addImageField, addShape, addText } from './addActions'
import { importAndPlace, pickFiles } from './imageActions'

export const ADD_ITEMS = [
  { id: 'text', label: 'Text', icon: Type, run: addText },
  {
    id: 'image',
    label: 'Image…',
    icon: Image,
    run: async () => importAndPlace(await pickFiles(IMAGE_ACCEPT), undefined, true),
  },
  { id: 'imageField', label: 'Image field (art box)', icon: ImagePlus, run: addImageField },
  { id: 'iconRow', label: 'Icon row (stat)', icon: Rows3, run: addIconRow },
  { id: 'cardNumber', label: 'Card number', icon: Hash, run: addCardNumber },
  { id: 'rect', label: 'Rectangle', icon: Square, run: () => addShape('rect') },
  { id: 'ellipse', label: 'Ellipse', icon: Circle, run: () => addShape('ellipse') },
  { id: 'line', label: 'Line', icon: Minus, run: () => addShape('line') },
] as const
