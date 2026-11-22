import type { Pricing } from '@/types'

export const PRICING_LABEL: Record<Pricing, string> = {
  free: 'Free',
  freemium: 'Freemium',
  paid: 'Paid',
  unverified: 'Unverified',
}

export const PRICING_OPTIONS: { value: Pricing; label: string }[] = [
  { value: 'free', label: PRICING_LABEL.free },
  { value: 'freemium', label: PRICING_LABEL.freemium },
  { value: 'paid', label: PRICING_LABEL.paid },
  { value: 'unverified', label: PRICING_LABEL.unverified },
]