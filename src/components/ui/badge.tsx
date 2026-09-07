import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 select-none',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#0071E3] text-white shadow-sm dark:bg-[#00E5FF] dark:text-black dark:font-bold',
        secondary:
          'border-transparent bg-black/[0.05] text-[#1D1D1F] dark:bg-white/[0.1] dark:text-[#F2F5F5]',
        destructive:
          'border-transparent bg-[#FF3B30] text-white shadow-sm dark:bg-[#FF453A]',
        outline:
          'border-black/[0.12] text-[#1D1D1F] dark:border-white/[0.15] dark:text-[#F2F5F5]',
        glass:
          'border-white/80 bg-white/70 text-[#0071E3] backdrop-blur-md shadow-xs dark:border-white/10 dark:bg-[#111417] dark:text-[#00E5FF]',
        success:
          'border-transparent bg-[#34C759] text-white dark:bg-[#30D158] dark:text-black',
        warning:
          'border-transparent bg-[#FF9500] text-white dark:bg-[#FF9F0A] dark:text-black',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
