declare module 'imagetracerjs' {
  interface ImageDataLike {
    width: number
    height: number
    data: Uint8ClampedArray | number[]
  }
  const ImageTracer: {
    imagedataToSVG(imgd: ImageDataLike, options?: Record<string, unknown> | string): string
  }
  export default ImageTracer
}
