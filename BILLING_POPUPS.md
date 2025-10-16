# Billing Popups Implementation

This document describes the billing popup system implemented for the Studygram course platform.

## Overview

The billing popup system provides a seamless way to prompt users for upgrades when they hit plan limits or try to access premium features. It includes:

- **Billing Provider**: Context provider for managing billing state
- **Billing Popup**: Full-featured upgrade dialog with pricing plans
- **Billing Notification**: Quick notification for feature restrictions
- **Stripe Integration**: Payment processing with Stripe Checkout

## Components

### 1. BillingProvider (`components/providers/billing-provider.tsx`)

The main context provider that manages billing state and provides utility functions:

```tsx
const { 
  showUpgradePopup, 
  showBillingNotification, 
  checkFeatureAccess, 
  checkStorageLimit, 
  checkCourseLimit 
} = useBilling()
```

**Functions:**
- `showUpgradePopup(type, trigger)` - Shows the full upgrade popup
- `showBillingNotification(title, message, feature, type)` - Shows quick notification
- `checkFeatureAccess(feature)` - Checks if user has access to a feature
- `checkStorageLimit(usage)` - Checks storage limits
- `checkCourseLimit(count)` - Checks course count limits

### 2. BillingPopup (`components/billing/billing-popup.tsx`)

Full-featured upgrade dialog with:
- Multiple pricing plans (Free, Pro, Premium)
- Feature comparisons
- Stripe checkout integration
- Responsive design

**Usage:**
```tsx
showUpgradePopup('limit', 'Course Upload')
showUpgradePopup('storage', 'File Upload')
showUpgradePopup('premium-feature', 'AI Insights')
```

### 3. BillingNotification (`components/billing/billing-notification.tsx`)

Quick notification popup for feature restrictions:

**Usage:**
```tsx
showBillingNotification(
  'Feature Locked',
  'This feature requires a Pro subscription.',
  'Advanced Analytics',
  'premium'
)
```

## Integration Examples

### Course Page Integration

The course detail page includes several billing checks:

1. **Note Limits**: Free users limited to 3 notes per course
2. **Analytics Access**: Advanced analytics require Pro plan
3. **Bulk Downloads**: Multiple file downloads require Pro plan
4. **AI Insights**: Premium feature for study recommendations

### Upload Page Integration

The course upload page checks:

1. **Course Limits**: Free users limited to 3 courses
2. **Storage Limits**: File size restrictions per plan
3. **Feature Access**: Premium upload features

## Plan Configuration

Current plan structure:

```tsx
const plans = {
  free: {
    maxCourses: 3,
    maxStoragePerCourse: 100 * 1024 * 1024, // 100MB
    features: ['basic-tracking', 'simple-notes']
  },
  pro: {
    maxCourses: Infinity,
    maxStoragePerCourse: 1024 * 1024 * 1024, // 1GB
    features: ['ai-insights', 'advanced-analytics', 'bulk-download']
  },
  premium: {
    maxCourses: Infinity,
    maxStoragePerCourse: 5 * 1024 * 1024 * 1024, // 5GB
    features: ['collaboration', 'white-label', 'integrations']
  }
}
```

## Stripe Integration

### Setup Required

1. Set environment variables:
   ```env
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_SECRET_KEY=sk_test_...
   ```

2. The system creates Stripe checkout sessions via `/api/create-checkout-session`

3. Success page handles post-payment flow at `/dashboard/billing/success`

### Payment Flow

1. User clicks upgrade button
2. System creates Stripe checkout session
3. User redirected to Stripe Checkout
4. After payment, user redirected to success page
5. Webhook updates user subscription status (to be implemented)

## Usage in Components

### Basic Feature Check

```tsx
import { useBilling } from '@/components/providers/billing-provider'

function MyComponent() {
  const { checkFeatureAccess, showBillingNotification } = useBilling()
  
  const handlePremiumFeature = () => {
    if (!checkFeatureAccess('ai-insights')) {
      showBillingNotification(
        'Premium Feature',
        'AI insights are available for Pro subscribers.',
        'AI Insights',
        'premium'
      )
      return
    }
    
    // Execute premium feature
  }
}
```

### Limit Checks

```tsx
const handleCreateCourse = async () => {
  // Check course limit
  if (!checkCourseLimit(currentCourseCount)) {
    showUpgradePopup('limit', 'Course Creation')
    return
  }
  
  // Check storage limit
  if (!checkStorageLimit(fileSize)) {
    showUpgradePopup('storage', 'File Upload')
    return
  }
  
  // Proceed with creation
}
```

## Customization

### Adding New Features

1. Update feature lists in `billing-provider.tsx`
2. Add feature checks where needed
3. Update pricing plans in `billing-popup.tsx`

### Styling

The components use Tailwind CSS and can be customized by:
- Modifying the gradient colors
- Updating the pricing plan layouts
- Changing the notification styles

## Future Enhancements

1. **Webhook Integration**: Handle Stripe webhooks for subscription updates
2. **Usage Tracking**: Real-time usage monitoring
3. **Team Plans**: Multi-user subscription support
4. **Custom Pricing**: Dynamic pricing based on usage
5. **Trial Periods**: Free trial functionality

## Testing

To test the billing popups:

1. The system defaults to 'free' plan
2. Try accessing premium features to see notifications
3. Try creating more than 3 courses to see limit popup
4. Upload large files to test storage limits

The billing system is designed to be non-intrusive while effectively guiding users toward upgrades when they need more functionality.
