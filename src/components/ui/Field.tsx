import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const baseClasses =
  'w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-charcoal placeholder:text-gray-400 focus:border-regal focus:outline-none focus:ring-1 focus:ring-regal'

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-charcoal">{children}</label>
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-[44px] ${baseClasses} ${props.className ?? ''}`} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${baseClasses} ${props.className ?? ''}`} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`min-h-[44px] ${baseClasses} ${props.className ?? ''}`} />
}

export function FormRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
