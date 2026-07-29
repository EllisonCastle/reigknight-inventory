import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-regal text-white hover:bg-regal-hover disabled:opacity-50',
  secondary: 'bg-white text-charcoal border border-gray-300 hover:bg-surface disabled:opacity-50',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50 disabled:opacity-50',
  ghost: 'bg-transparent text-charcoal hover:bg-surface disabled:opacity-50',
}

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-3.5 py-2 text-base font-medium transition-colors disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...props}
    />
  )
}
