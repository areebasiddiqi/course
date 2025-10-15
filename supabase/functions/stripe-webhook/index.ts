import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.18.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No Stripe signature found')
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured')
    }

    let event: Stripe.Event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err}`)
      return new Response('Webhook signature verification failed', { status: 400 })
    }

    console.log(`Processing webhook event: ${event.type}`)

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChange(event.data.object as Stripe.Subscription)
        break
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string
  const status = subscription.status

  // Find user by Stripe customer ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, subscription_plan, subscription_status')
    .eq('stripe_customer_id', customerId)
    .single()

  if (userError || !user) {
    console.error('User not found for customer ID:', customerId)
    return
  }

  // Get the price ID from the subscription
  const priceId = subscription.items.data[0]?.price.id
  if (!priceId) {
    console.error('No price ID found in subscription')
    return
  }

  // Find the subscription plan name by Stripe price ID
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('name')
    .eq('stripe_price_id', priceId)
    .single()

  if (planError || !plan) {
    console.error('Subscription plan not found for price ID:', priceId)
    return
  }

  // Map Stripe status to our subscription status
  let subscriptionStatus = 'inactive'
  if (status === 'active') subscriptionStatus = 'active'
  else if (status === 'canceled') subscriptionStatus = 'cancelled'
  else if (status === 'incomplete' || status === 'incomplete_expired') subscriptionStatus = 'inactive'

  // Calculate subscription end date
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000)
  const subscriptionEndDate = subscription.cancel_at_period_end
    ? currentPeriodEnd
    : null

  // Update user subscription
  const { error: updateError } = await supabase
    .from('users')
    .update({
      subscription_plan: plan.name,
      subscription_status: subscriptionStatus,
      subscription_end_date: subscriptionEndDate,
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('Error updating user subscription:', updateError)
    return
  }

  console.log(`Updated subscription for user ${user.id}: ${plan.name} (${subscriptionStatus})`)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!user) {
    console.error('User not found for customer ID:', customerId)
    return
  }

  // Reset usage stats for the new billing period
  const { error } = await supabase
    .from('usage_stats')
    .update({
      ai_queries_used: 0,
      audio_minutes_used: 0,
      project_generations_used: 0,
      reset_date: new Date(),
    })
    .eq('user_id', user.id)

  if (error) {
    console.error('Error resetting usage stats:', error)
  }

  console.log(`Reset usage stats for user ${user.id}`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string

  // Find user by Stripe customer ID
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!user) {
    console.error('User not found for customer ID:', customerId)
    return
  }

  // Set subscription status to inactive due to payment failure
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'inactive',
    })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating subscription status:', error)
  }

  console.log(`Set subscription to inactive for user ${user.id} due to payment failure`)
}
