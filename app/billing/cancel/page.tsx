'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { XCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function PaymentCancelPage() {
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-gray-600" />
            </div>
            <CardTitle className="text-2xl text-gray-600">Payment Cancelled</CardTitle>
            <CardDescription className="text-lg">
              You cancelled the payment process. No charges were made to your account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-2">What happened?</h3>
              <ul className="text-gray-700 space-y-2 text-sm">
                <li>• You cancelled the checkout process</li>
                <li>• No payment was processed</li>
                <li>• Your account remains unchanged</li>
                <li>• You can try again anytime</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold">Still interested in upgrading?</h3>
              <p className="text-gray-600 text-sm">
                Premium features include unlimited course uploads, advanced analytics, priority support, and much more.
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href="/billing">
                  View Plans
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/billing/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Billing
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
