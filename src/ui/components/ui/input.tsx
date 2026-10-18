import * as React from 'react'
import { cn } from '@/lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full min-w-0 rounded-md border border-input bg-panel px-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-accent md:h-8 md:text-sm',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'h-11 w-full min-w-0 rounded-md border border-input bg-panel px-2 text-base outline-none focus-visible:border-accent md:h-8 md:text-sm',
      className,
    )}
    {...props}
  />
))
NativeSelect.displayName = 'NativeSelect'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-xs font-medium text-muted-foreground', className)} {...props} />
}
