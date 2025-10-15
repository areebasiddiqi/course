'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/providers/auth-provider'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Star
} from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase-client'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'

interface SubscriptionInfo {
  plan: string
  status: 'active' | 'inactive' | 'cancelled'
  endDate: string | null
  stripeCustomerId: string | null
}

interface UsageStats {
  ai_queries_used: number
  ai_queries_limit: number
  audio_minutes_used: number
  audio_minutes_limit: number
  project_generations_used: number
  project_generations_limit: number
}

export default function BillingDashboard() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingPortalLoading, setBillingPortalLoading] = useState(false)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchBillingInfo()
    }
  }, [user])

  const fetchBillingInfo = async () => {
    if (!user) return

    try {
      // Fetch subscription info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_plan, subscription_status, subscription_end_date, stripe_customer_id')
        .eq('id', user.id)
        .single()

      if (userError) {
        console.error('Error fetching subscription:', userError)
      } else {
        setSubscription({
          plan: userData.subscription_plan,
          status: userData.subscription_status,
          endDate: userData.subscription_end_date,
          stripeCustomerId: userData.stripe_customer_id,
        })
      }

      // Fetch usage stats
      const { data: usageData, error: usageError } = await supabase
        .from('usage_stats')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (usageError) {
        console.error('Error fetching usage stats:', usageError)
      } else {
        // Get plan limits for comparison
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('ai_queries_limit, audio_minutes_limit, project_generations_limit')
          .eq('name', userData?.subscription_plan || 'free')
          .single()

        if (planData) {
          setUsage({
            ai_queries_used: usageData.ai_queries_used,
            ai_queries_limit: planData.ai_queries_limit,
            audio_minutes_used: usageData.audio_minutes_used,
            audio_minutes_limit: planData.audio_minutes_limit,
            project_generations_used: usageData.project_generations_used,
            project_generations_limit: planData.project_generations_limit,
          })
        }
      }
    } catch (error) {
      console.error('Error fetching billing info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    if (!subscription?.stripeCustomerId) {
      alert('No active subscription found')
      return
    }

    setBillingPortalLoading(true)

    try {
      // Create a customer portal session
      const { data, error } = await supabase.functions.invoke('create-billing-portal', {
        body: {
          customerId: subscription.stripeCustomerId,
          returnUrl: `${window.location.origin}/billing`,
        },
      })

      if (error) {
        console.error('Error creating billing portal:', error)
        alert('Failed to open billing portal. Please try again.')
        return
      }

      if (data?.url) {
        window.location.href = data.url
      } else {
        alert('Failed to create billing portal session.')
      }
    } catch (error) {
      console.error('Error opening billing portal:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setBillingPortalLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getUsagePercentage = (used: number, limit: number) => {
    return Math.min((used / limit) * 100, 100)
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Billing & Subscription</h1>
            <p className="text-gray-600 mt-2">Manage your subscription and billing information</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href="/billing">
                <CreditCard className="w-4 h-4 mr-2" />
                View Plans
              </Link>
            </Button>
            {subscription?.stripeCustomerId && (
              <Button onClick={handleManageBilling} disabled={billingPortalLoading}>
                {billingPortalLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Billing
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Subscription Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold capitalize">{subscription.plan} Plan</h3>
                    <p className="text-gray-600">
                      {subscription.endDate
                        ? `Expires on ${formatDate(new Date(subscription.endDate))}`
                        : 'No expiration date'
                      }
                    </p>
                  </div>
                  <Badge className={getStatusColor(subscription.status)}>
                    {getStatusIcon(subscription.status)}
                    <span className="ml-1 capitalize">{subscription.status}</span>
                  </Badge>
                </div>

                {subscription.status === 'active' && (
                  <div className="pt-4 border-t">
                    <Button asChild>
                      <Link href="/billing">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Upgrade or Change Plan
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                <p className="text-gray-600 mb-4">
                  You're currently on the free plan. Upgrade to unlock premium features.
                </p>
                <Button asChild>
                  <Link href="/billing">
                    <Star className="w-4 h-4 mr-2" />
                    View Plans
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Stats */}
        {usage && subscription?.status === 'active' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Usage This Month
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>AI Queries</span>
                    <span>{usage.ai_queries_used} / {usage.ai_queries_limit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${getUsagePercentage(usage.ai_queries_used, usage.ai_queries_limit)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Audio Minutes</span>
                    <span>{usage.audio_minutes_used} / {usage.audio_minutes_limit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${getUsagePercentage(usage.audio_minutes_used, usage.audio_minutes_limit)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Project Generations</span>
                    <span>{usage.project_generations_used} / {usage.project_generations_limit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${getUsagePercentage(usage.project_generations_used, usage.project_generations_limit)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Billing History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Billing history will appear here once you have an active subscription.</p>
              <p className="text-sm mt-2">Access detailed invoices and payment history through the billing portal above.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
