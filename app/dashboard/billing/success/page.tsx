'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Crown, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function BillingSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [sessionData, setSessionData] = useState<any>(null)

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    
    if (sessionId) {
      // In a real app, you'd verify the session with your backend
      // For now, we'll simulate success
      setTimeout(() => {
        setSessionData({
          planName: 'Pro',
          amount: '$9.99',
          period: 'month'
        })
        setIsLoading(false)
      }, 1000)
    } else {
      setIsLoading(false)
    }
  }, [searchParams])

  if (isLoading) {
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
      <div className="max-w-2xl mx-auto py-12">
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-yellow-500 mr-2" />
                <h3 className="text-xl font-semibold">Welcome to {sessionData?.planName || 'Pro'}!</h3>
              </div>
              <p className="text-gray-600 mb-4">
                Your subscription has been activated successfully. You now have access to all premium features.
              </p>
              <div className="text-sm text-gray-500">
                Amount: {sessionData?.amount || '$9.99'}/{sessionData?.period || 'month'}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2">✨ What's New</h4>
                <ul className="text-xs space-y-1 text-gray-600">
                  <li>• Unlimited courses</li>
                  <li>• AI-powered insights</li>
                  <li>• Advanced analytics</li>
                  <li>• Priority support</li>
                </ul>
              </div>
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-sm mb-2">🎯 Next Steps</h4>
                <ul className="text-xs space-y-1 text-gray-600">
                  <li>• Explore AI insights</li>
                  <li>• Upload more courses</li>
                  <li>• Try advanced features</li>
                  <li>• Contact support if needed</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/dashboard/courses">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Continue Learning
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href="/dashboard/billing">
                  View Billing
                </Link>
              </Button>
            </div>

            <div className="text-xs text-gray-500">
              🔒 Your payment is secure and processed by Stripe
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
