'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (sessionId) {
      verifyPayment(sessionId)
    } else {
      setLoading(false)
      setError('No session ID provided')
    }
  }, [sessionId])

  const verifyPayment = async (sessionId: string) => {
    try {
      // In a real implementation, you'd verify the session with Stripe
      // For now, we'll assume success if we have a session ID
      setSuccess(true)
    } catch (error) {
      console.error('Error verifying payment:', error)
      setError('Failed to verify payment status')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-600">Verifying your payment...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader className="text-center">
            {success ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
                <CardDescription className="text-lg">
                  Thank you for your subscription. Your account has been upgraded and you now have access to premium features.
                </CardDescription>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <CardTitle className="text-2xl text-red-600">Payment Failed</CardTitle>
                <CardDescription className="text-lg">
                  We couldn't process your payment. Please try again or contact support if the issue persists.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-6">
            {success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">What's Next?</h3>
                  <ul className="text-green-700 space-y-2 text-sm">
                    <li>• Your subscription is now active</li>
                    <li>• Premium features are unlocked</li>
                    <li>• You'll receive a confirmation email shortly</li>
                    <li>• Usage limits have been reset</li>
                  </ul>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/dashboard">
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/billing/dashboard">
                      View Subscription
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 mb-2">What can you do?</h3>
                  <ul className="text-red-700 space-y-2 text-sm">
                    <li>• Try a different payment method</li>
                    <li>• Check your card details</li>
                    <li>• Contact your bank if needed</li>
                    <li>• Try again in a few minutes</li>
                  </ul>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button asChild>
                    <Link href="/billing">
                      Try Again
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/billing/dashboard">
                      Back to Billing
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
