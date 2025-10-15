import { Stripe } from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const formatAmountForStripe = (amount: number): number => {
  return Math.round(amount * 100) // Convert dollars to cents
}

export const formatAmountFromStripe = (amount: number): number => {
  return amount / 100 // Convert cents to dollars
}
