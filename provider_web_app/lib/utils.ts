import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting for INR (Rupee)
export function formatINR(amount: number | null | undefined, opts: { showZero?: boolean } = {}): string {
  if (amount == null || isNaN(amount)) return "--"
  if (!opts.showZero && amount === 0) return "--"
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount)
  } catch {
    return `₹${amount.toFixed(2)}`
  }
}
