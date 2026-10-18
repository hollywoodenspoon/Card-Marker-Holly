import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import * as React from 'react'
import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground hover:brightness-110 active:brightness-95',
        secondary: 'bg-muted text-foreground hover:bg-border/70',
        ghost: 'text-foreground hover:bg-muted',
        outline: 'border bg-panel hover:bg-muted',
        danger: 'bg-danger text-white hover:brightness-110',
      },
      size: {
        default: 'h-11 px-4 md:h-9',
        sm: 'h-11 px-3 text-xs md:h-8',
        icon: 'size-11 md:size-9',
        'icon-sm': 'size-11 md:size-8',
      },
      active: { true: 'bg-accent-soft text-accent hover:bg-accent-soft', false: '' },
    },
    defaultVariants: { variant: 'default', size: 'default', active: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, active, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : (type ?? 'button')}
        className={cn(buttonVariants({ variant, size, active }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

/** Square icon button; `label` is required so every icon has an accessible name. */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  ButtonProps & { label: string }
>(({ label, variant = 'ghost', size = 'icon', ...props }, ref) => (
  <Button ref={ref} variant={variant} size={size} aria-label={label} title={label} {...props} />
))
IconButton.displayName = 'IconButton'
