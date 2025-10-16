'use client'

import { useState } from 'react'
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
import { 
  Crown, 
  X, 
  ArrowRight,
  Sparkles
} from 'lucide-react'

interface BillingNotificationProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
  title: string
  message: string
  feature?: string
  type?: 'warning' | 'info' | 'premium'
}

export function BillingNotification({ 
  isOpen, 
  onClose, 
  onUpgrade, 
  title, 
  message, 
  feature,
  type = 'info' 
}: BillingNotificationProps) {
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          icon: <Crown className="w-8 h-8 text-orange-500" />,
          gradient: 'from-orange-500 to-red-500',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        }
      case 'premium':
        return {
          icon: <Sparkles className="w-8 h-8 text-purple-500" />,
          gradient: 'from-purple-500 to-pink-500',
          bgColor: 'bg-purple-50',
          borderColor: 'border-purple-200'
        }
      default:
        return {
          icon: <Crown className="w-8 h-8 text-blue-500" />,
          gradient: 'from-blue-500 to-purple-500',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className={`p-3 rounded-full ${styles.bgColor} ${styles.borderColor} border`}>
              {styles.icon}
            </div>
          </div>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {message}
          </DialogDescription>
          {feature && (
            <Badge variant="outline" className="mx-auto mt-3">
              Feature: {feature}
            </Badge>
          )}
        </DialogHeader>

        <div className={`${styles.bgColor} ${styles.borderColor} border rounded-lg p-4 my-4`}>
          <div className="text-center">
            <h4 className="font-semibold text-sm mb-2">Upgrade Benefits</h4>
            <ul className="text-xs space-y-1 text-gray-600">
              <li>✨ Unlimited courses and storage</li>
              <li>🤖 AI-powered study insights</li>
              <li>📊 Advanced analytics</li>
              <li>🎯 Priority support</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2">
          <Button 
            onClick={onUpgrade}
            className={`w-full bg-gradient-to-r ${styles.gradient} hover:opacity-90 text-white`}
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Continue with Free Plan
          </Button>
        </DialogFooter>

        <div className="text-center text-xs text-gray-500 mt-2">
          💳 Cancel anytime • 🔒 Secure payment
        </div>
      </DialogContent>
    </Dialog>
  )
}
