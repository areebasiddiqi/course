'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, Star } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { useRouter } from 'next/navigation'

interface SubscriptionPlan {
  id: string
  name: string
  price: number // in cents
  duration_months: number
  ai_queries_limit: number
  audio_minutes_limit: number
  project_generations_limit: number
  features: string[]
  stripe_price_id?: string
}

export default function PricingPage() {
  const { user } = useAuth()
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true })

      if (error) {
        console.error('Error fetching plans:', error)
        return
      }

      setPlans(data || [])
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    setSelectedPlan(planId)

    try {
      const plan = plans.find(p => p.id === planId)
      if (!plan || !plan.stripe_price_id) {
        alert('This plan is not available for purchase yet.')
        return
      }

      // Call the create-checkout-session edge function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: plan.stripe_price_id,
          userId: user.id,
        },
      })

      if (error) {
        console.error('Error creating checkout session:', error)
        alert('Failed to start checkout process. Please try again.')
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create checkout session. Please try again.')
      }
    } catch (error) {
      console.error('Error subscribing:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setSelectedPlan(null)
    }
  }

  const formatPrice = (price: number) => {
    return `$${(price / 100).toFixed(2)}`
  }

  const formatDuration = (months: number) => {
    if (months === 1) return 'month'
    return `${months} months`
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Choose Your Plan</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Unlock premium features and take your learning to the next level with our subscription plans.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative">
              {plan.name === 'Session Plan' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600">
                  Perfect for {plan.duration_months === 4 ? 'semester-long' : 'year-round'} study sessions
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">
                    {formatPrice(plan.price)}
                    <span className="text-lg font-normal text-gray-600">/{formatDuration(plan.duration_months)}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    ${(plan.price / 100 / plan.duration_months).toFixed(2)} per month
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      <strong>{plan.ai_queries_limit}</strong> AI queries per month
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      <strong>{plan.audio_minutes_limit}</strong> minutes of audio content
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      <strong>{plan.project_generations_limit}</strong> project generations
                    </span>
                  </div>

                  {/* Additional features */}
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Subscribe Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={selectedPlan === plan.id}
                >
                  {selectedPlan === plan.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 mr-2" />
                      Subscribe Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Can I cancel anytime?</h4>
              <p className="text-gray-600 text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-gray-600 text-sm">
                We accept all major credit cards and debit cards through Stripe's secure payment processing.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Is there a free trial?</h4>
              <p className="text-gray-600 text-sm">
                We offer a free tier with basic features. Premium features require a subscription.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
