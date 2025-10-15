import { loadStripe } from '@stripe/stripe-js'

// Initialize Stripe with publishable key
let stripePromise: Promise<any>

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Stripe webhook event types
export type StripeWebhookEvent =
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed'

// Subscription status mapping
export const mapStripeStatusToDb = (stripeStatus: string): 'active' | 'inactive' | 'cancelled' => {
  switch (stripeStatus) {
    case 'active':
      return 'active'
    case 'canceled':
      return 'cancelled'
    case 'incomplete':
    case 'incomplete_expired':
    case 'past_due':
    case 'unpaid':
      return 'inactive'
    default:
      return 'inactive'
  }
}
