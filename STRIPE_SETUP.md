# Stripe Integration Setup

This project includes a complete Stripe integration for subscription management. Follow these steps to set it up:

## 1. Environment Variables

Add these variables to your `.env.local` file:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Your app URL (for redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2. Stripe Dashboard Setup

### Create Products and Prices

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Create two products:
   - **Semester Plan**: $15.00 (4 months)
   - **Session Plan**: $25.00 (12 months)

3. For each product, create a recurring price:
   - Interval: Monthly
   - Usage type: Licensed

4. Copy the Price IDs and update the database:
   ```sql
   UPDATE subscription_plans
   SET stripe_price_id = 'price_your_actual_price_id_here'
   WHERE name = 'Semester Plan';

   UPDATE subscription_plans
   SET stripe_price_id = 'price_your_actual_price_id_here'
   WHERE name = 'Session Plan';
   ```

## 3. Webhook Configuration

1. In Stripe Dashboard, go to Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

4. Copy the webhook secret and add it to your environment variables

## 4. Deploy Edge Functions

Deploy the Supabase edge functions:

```bash
supabase functions deploy stripe-webhook
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal
```

## 5. Database Migration

Run the database migration to add the `stripe_customer_id` field:

```sql
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
```

## 6. Features Included

### Pages
- `/billing` - Pricing page with subscription plans
- `/billing/dashboard` - Subscription management dashboard
- `/billing/success` - Payment success page
- `/billing/cancel` - Payment cancellation page

### Edge Functions
- `stripe-webhook` - Handles Stripe webhook events
- `create-checkout-session` - Creates Stripe checkout sessions
- `create-billing-portal` - Creates customer portal sessions

### Features
- Subscription plan selection
- Secure payment processing via Stripe Checkout
- Subscription management via Stripe Customer Portal
- Usage tracking and limits
- Automatic subscription status updates
- Webhook event handling for payment status changes

## 7. Testing

1. Start your development server
2. Navigate to `/billing` to see the pricing page
3. Select a plan and complete the Stripe checkout flow
4. Check that the subscription status updates correctly
5. Test the billing dashboard functionality

## 8. Production Considerations

- Replace test API keys with live keys
- Update webhook URLs for production
- Configure proper domain for redirects
- Set up proper error handling
- Monitor webhook delivery
- Set up proper logging

## 9. Troubleshooting

### Common Issues

1. **Webhook signature verification failed**
   - Check that the webhook secret is correct
   - Ensure the webhook endpoint URL is correct

2. **Checkout session creation fails**
   - Verify API keys are correct
   - Check that price IDs exist and are valid

3. **Subscription status not updating**
   - Check webhook events are being sent
   - Verify the webhook handler is processing events correctly

For more help, check the Stripe documentation or the Supabase edge functions logs.
