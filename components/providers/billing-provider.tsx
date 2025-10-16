'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { BillingPopup } from '@/components/billing/billing-popup'
import { BillingNotification } from '@/components/billing/billing-notification'

interface BillingContextType {
  showUpgradePopup: (type?: 'upgrade' | 'limit' | 'premium-feature' | 'storage', trigger?: string) => void
  showBillingNotification: (title: string, message: string, feature?: string, type?: 'warning' | 'info' | 'premium') => void
  checkFeatureAccess: (feature: string) => boolean
  checkStorageLimit: (currentUsage: number) => boolean
  checkCourseLimit: (currentCount: number) => boolean
}

const BillingContext = createContext<BillingContextType | undefined>(undefined)

interface BillingProviderProps {
  children: React.ReactNode
}

// Mock user plan - in real app, this would come from your auth/user context
const mockUserPlan = {
  type: 'free', // 'free' | 'pro' | 'premium'
  maxCourses: 3,
  maxStoragePerCourse: 100 * 1024 * 1024, // 100MB in bytes
  features: ['basic-tracking', 'simple-notes']
}

export function BillingProvider({ children }: BillingProviderProps) {
  const [popupState, setPopupState] = useState<{
    isOpen: boolean
    type: 'upgrade' | 'limit' | 'premium-feature' | 'storage'
    trigger?: string
  }>({
    isOpen: false,
    type: 'upgrade'
  })

  const [notificationState, setNotificationState] = useState<{
    isOpen: boolean
    title: string
    message: string
    feature?: string
    type?: 'warning' | 'info' | 'premium'
  }>({
    isOpen: false,
    title: '',
    message: ''
  })

  const showUpgradePopup = useCallback((
    type: 'upgrade' | 'limit' | 'premium-feature' | 'storage' = 'upgrade', 
    trigger?: string
  ) => {
    setPopupState({
      isOpen: true,
      type,
      trigger
    })
  }, [])

  const showBillingNotification = useCallback((
    title: string, 
    message: string, 
    feature?: string, 
    type: 'warning' | 'info' | 'premium' = 'info'
  ) => {
    setNotificationState({
      isOpen: true,
      title,
      message,
      feature,
      type
    })
  }, [])

  const checkFeatureAccess = useCallback((feature: string): boolean => {
    // Define feature access based on plan
    const featureAccess = {
      free: ['basic-tracking', 'simple-notes', 'basic-analytics'],
      pro: ['basic-tracking', 'simple-notes', 'basic-analytics', 'ai-insights', 'advanced-analytics', 'export', 'themes'],
      premium: ['basic-tracking', 'simple-notes', 'basic-analytics', 'ai-insights', 'advanced-analytics', 'export', 'themes', 'collaboration', 'white-label', 'integrations']
    }

    const userFeatures = featureAccess[mockUserPlan.type as keyof typeof featureAccess] || []
    return userFeatures.includes(feature)
  }, [])

  const checkStorageLimit = useCallback((currentUsage: number): boolean => {
    return currentUsage <= mockUserPlan.maxStoragePerCourse
  }, [])

  const checkCourseLimit = useCallback((currentCount: number): boolean => {
    if (mockUserPlan.type === 'free') {
      return currentCount < mockUserPlan.maxCourses
    }
    return true // Pro and Premium have unlimited courses
  }, [])

  const closePopup = () => {
    setPopupState(prev => ({ ...prev, isOpen: false }))
  }

  const closeNotification = () => {
    setNotificationState(prev => ({ ...prev, isOpen: false }))
  }

  const handleUpgradeFromNotification = () => {
    closeNotification()
    showUpgradePopup('upgrade', notificationState.feature)
  }

  const contextValue: BillingContextType = {
    showUpgradePopup,
    showBillingNotification,
    checkFeatureAccess,
    checkStorageLimit,
    checkCourseLimit
  }

  return (
    <BillingContext.Provider value={contextValue}>
      {children}
      
      <BillingPopup
        isOpen={popupState.isOpen}
        onClose={closePopup}
        type={popupState.type}
        trigger={popupState.trigger}
      />
      
      <BillingNotification
        isOpen={notificationState.isOpen}
        onClose={closeNotification}
        onUpgrade={handleUpgradeFromNotification}
        title={notificationState.title}
        message={notificationState.message}
        feature={notificationState.feature}
        type={notificationState.type}
      />
    </BillingContext.Provider>
  )
}

export function useBilling() {
  const context = useContext(BillingContext)
  if (context === undefined) {
    throw new Error('useBilling must be used within a BillingProvider')
  }
  return context
}
