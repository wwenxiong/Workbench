import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-[13.5px] font-medium tracking-tight transition-all duration-150 select-none cursor-pointer disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 dark:focus-visible:ring-[#00E5FF]/40 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[#0071E3] text-white shadow-sm hover:bg-[#0077ED] active:bg-[#0062C4] dark:bg-[#00E5FF] dark:text-black dark:font-semibold dark:hover:bg-[#33EAFF] dark:active:bg-[#00B4CC]',
        secondary:
          'bg-black/[0.05] text-[#1D1D1F] border border-black/[0.06] hover:bg-black/[0.08] active:bg-black/[0.1] dark:bg-white/[0.08] dark:text-[#F2F5F5] dark:border-white/[0.08] dark:hover:bg-white/[0.12]',
        outline:
          'border border-black/[0.12] bg-white/75 backdrop-blur-md text-[#1D1D1F] shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-white active:bg-black/[0.02] dark:border-white/[0.12] dark:bg-[#0C0F11]/80 dark:text-[#F2F5F5] dark:hover:bg-[#111417]',
        ghost:
          'text-[#1D1D1F] hover:bg-black/[0.05] active:bg-black/[0.08] dark:text-[#F2F5F5] dark:hover:bg-white/[0.08]',
        destructive:
          'bg-[#FF3B30] text-white shadow-sm hover:bg-[#E0342A] active:bg-[#C92A21] dark:bg-[#FF453A]',
        glass:
          'bg-white/80 backdrop-blur-xl border border-white/90 text-[#0071E3] shadow-sm hover:bg-white hover:shadow-md dark:bg-[#0C0F11]/80 dark:border-white/10 dark:text-[#00E5FF] dark:hover:bg-[#111417]',
        link:
          'text-[#0071E3] underline-offset-4 hover:underline dark:text-[#00E5FF]',
      },
      size: {
        default: 'h-9 px-4 py-2 rounded-xl',
        sm: 'h-8 px-3 text-[12px] rounded-lg gap-1.5',
        lg: 'h-10 px-5 text-[15px] rounded-xl font-semibold gap-2.5',
        icon: 'h-9 w-9 rounded-xl p-0',
        'icon-sm': 'h-7 w-7 rounded-lg p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
