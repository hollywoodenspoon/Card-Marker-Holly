/** Placeholder until the Konva stage lands in step 3. */
export function CanvasArea() {
  return (
    <div className="relative grid min-h-0 flex-1 place-items-center overflow-hidden bg-canvas">
      <div
        className="rounded-[3mm] bg-white shadow-lg"
        style={{ width: 'min(70%, 430px)', aspectRatio: '86 / 54' }}
      />
    </div>
  )
}
