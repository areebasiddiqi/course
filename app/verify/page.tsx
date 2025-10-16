'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { createSupabaseClient } from '@/lib/supabase-client'
import { BookOpen, CheckCircle, XCircle, Loader2, Mail } from 'lucide-react'

export default function VerifyPage() {
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createSupabaseClient()

  useEffect(() => {
    const handleEmailVerification = async () => {
      const token = searchParams.get('token')
      const type = searchParams.get('type')

      if (!token || type !== 'email') {
        setError('Invalid verification link')
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email',
        })

        if (error) {
          console.error('Verification error:', error)
          setError(error.message)
        } else if (data.user) {
          setVerified(true)
          toast({
            title: 'Email Verified!',
            description: 'Your email has been successfully verified.',
          })
          
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        }
      } catch (error) {
        console.error('Unexpected verification error:', error)
        setError('An unexpected error occurred during verification')
      } finally {
        setLoading(false)
      }
    }

    handleEmailVerification()
  }, [searchParams, supabase.auth, toast, router])

  const resendVerification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user?.email) {
        toast({
          title: 'Error',
          description: 'No email found. Please sign up again.',
          variant: 'destructive',
        })
        return
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      })

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Email Sent',
          description: 'A new verification email has been sent.',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend verification email',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {loading ? 'Verifying...' : verified ? 'Verified!' : 'Verification Failed'}
          </CardTitle>
          <CardDescription>
            {loading && 'Please wait while we verify your email address'}
            {verified && 'Your email has been successfully verified'}
            {error && 'There was an issue verifying your email'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center">
            {loading && (
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
            )}
            {verified && (
              <CheckCircle className="w-16 h-16 text-green-600" />
            )}
            {error && (
              <XCircle className="w-16 h-16 text-red-600" />
            )}
          </div>

          {loading && (
            <p className="text-center text-gray-600">
              Verifying your email address...
            </p>
          )}

          {verified && (
            <div className="text-center space-y-4">
              <p className="text-green-600 font-medium">
                Welcome to Studygram! Your account is now active.
              </p>
              <p className="text-sm text-gray-600">
                You'll be redirected to your dashboard in a few seconds.
              </p>
              <Button 
                onClick={() => router.push('/dashboard')} 
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <p className="text-red-600 font-medium">
                {error}
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={resendVerification}
                  variant="outline"
                  className="w-full"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </Button>
                <Button 
                  onClick={() => router.push('/auth/signup')}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Sign Up
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
