'use client'

import { useState } from 'react'
import { getStripe } from '@/lib/stripe-client'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CreditCard, 
  Check, 
  Star, 
  Zap, 
  Shield, 
  Users, 
  Download,
  Clock,
  BookOpen,
  Trophy
} from 'lucide-react'

interface BillingPopupProps {
  isOpen: boolean
  onClose: () => void
  type: 'upgrade' | 'limit' | 'premium-feature' | 'storage'
  trigger?: string
}

interface PricingPlan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: string[]
  popular?: boolean
  current?: boolean
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      '3 courses maximum',
      '100MB storage per course',
      'Basic study tracking',
      'Simple notes',
      'Community support'
    ],
    current: true
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    period: 'month',
    description: 'For serious learners',
    features: [
      'Unlimited courses',
      '1GB storage per course',
      'Advanced analytics',
      'AI-powered insights',
      'Priority support',
      'Export capabilities',
      'Custom themes'
    ],
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 19.99,
    period: 'month',
    description: 'For power users and teams',
    features: [
      'Everything in Pro',
      '5GB storage per course',
      'Team collaboration',
      'Advanced AI features',
      'Custom integrations',
      'White-label options',
      '24/7 phone support'
    ]
  }
]

export function BillingPopup({ isOpen, onClose, type, trigger }: BillingPopupProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>('pro')
  const [isProcessing, setIsProcessing] = useState(false)

  const getPopupContent = () => {
    switch (type) {
      case 'limit':
        return {
          title: 'Course Limit Reached',
          description: 'You\'ve reached the maximum number of courses for your free plan. Upgrade to continue adding courses.',
          icon: <BookOpen className="w-12 h-12 text-orange-500" />
        }
      case 'storage':
        return {
          title: 'Storage Limit Exceeded',
          description: 'Your course files exceed the storage limit. Upgrade for more space and better performance.',
          icon: <Download className="w-12 h-12 text-red-500" />
        }
      case 'premium-feature':
        return {
          title: 'Premium Feature',
          description: 'This feature is available for Pro and Premium subscribers. Unlock advanced capabilities today.',
          icon: <Star className="w-12 h-12 text-purple-500" />
        }
      default:
        return {
          title: 'Upgrade Your Learning',
          description: 'Unlock the full potential of your studies with advanced features and unlimited access.',
          icon: <Trophy className="w-12 h-12 text-blue-500" />
        }
    }
  }

  const handleUpgrade = async (planId: string) => {
    setIsProcessing(true)
    
    try {
      const selectedPlanData = pricingPlans.find(p => p.id === planId)
      if (!selectedPlanData) return

      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: selectedPlanData.id,
          planName: selectedPlanData.name,
          price: selectedPlanData.price,
          successUrl: `${window.location.origin}/dashboard/billing/success`,
          cancelUrl: window.location.href
        }),
      })

      const { sessionId, error } = await response.json()
      
      if (error) {
        throw new Error(error)
      }

      // Redirect to Stripe Checkout
      const stripe = await getStripe()
      const { error: stripeError } = await stripe!.redirectToCheckout({
        sessionId,
      })

      if (stripeError) {
        throw new Error(stripeError.message)
      }
    } catch (error) {
      console.error('Upgrade failed:', error)
      // You could show a toast notification here
    } finally {
      setIsProcessing(false)
    }
  }

  const content = getPopupContent()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            {content.icon}
          </div>
          <DialogTitle className="text-2xl font-bold">{content.title}</DialogTitle>
          <DialogDescription className="text-lg">
            {content.description}
          </DialogDescription>
          {trigger && (
            <Badge variant="outline" className="mx-auto mt-2">
              Triggered by: {trigger}
            </Badge>
          )}
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
          {pricingPlans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedPlan === plan.id 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:shadow-md'
              } ${plan.popular ? 'border-blue-500' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Current Plan
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  ${plan.price}
                  <span className="text-sm font-normal text-gray-600">
                    /{plan.period}
                  </span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Highlights */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-center">Why Upgrade?</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Zap className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-sm font-medium">AI-Powered</p>
              <p className="text-xs text-gray-600">Smart insights</p>
            </div>
            <div className="text-center">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Secure</p>
              <p className="text-xs text-gray-600">Enterprise-grade</p>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Collaboration</p>
              <p className="text-xs text-gray-600">Team features</p>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-sm font-medium">24/7 Support</p>
              <p className="text-xs text-gray-600">Always here</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Maybe Later
          </Button>
          
          {selectedPlan !== 'free' && (
            <Button 
              onClick={() => handleUpgrade(selectedPlan)}
              disabled={isProcessing}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Upgrade to {pricingPlans.find(p => p.id === selectedPlan)?.name}
                </>
              )}
            </Button>
          )}
        </DialogFooter>

        {/* Trust indicators */}
        <div className="text-center text-xs text-gray-500 mt-4">
          <p>🔒 Secure payment • 💳 Cancel anytime • 🎯 30-day money-back guarantee</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
