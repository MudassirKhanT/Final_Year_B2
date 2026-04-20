'use client'

import { useBilling } from '@/providers/billing-provider'
import { onPaymentDetails } from '../_actions/payment-connecetions'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { SubscriptionCard } from './subscription-card'
import CreditTracker from './creadits-tracker'

const BillingDashboard = () => {
  const { credits, tier, setCredits, setTier } = useBilling()
  const [stripeProducts, setStripeProducts] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      const [paymentDetails, stripeRes] = await Promise.allSettled([
        onPaymentDetails(),
        axios.get('/api/payment'),
      ])

      if (paymentDetails.status === 'fulfilled' && paymentDetails.value) {
        setCredits(paymentDetails.value.credits ?? '0')
        setTier(paymentDetails.value.tier ?? 'Free')
      }

      if (stripeRes.status === 'fulfilled' && stripeRes.value.data) {
        setStripeProducts(stripeRes.value.data)
      }
    }

    loadData()
    // setCredits and setTier are stable dispatch functions from useState — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPayment = async (id: string) => {
    try {
      const { data } = await axios.post(
        '/api/payment',
        { priceId: id },
        { headers: { 'Content-Type': 'application/json' } }
      )
      if (data) window.location.assign(data)
    } catch (error) {
      console.error('Payment error:', error)
    }
  }

  const numericCredits = credits === 'Unlimited' ? 100 : parseInt(credits) || 0

  return (
    <>
      <div className="flex gap-5 p-6">
        <SubscriptionCard
          onPayment={onPayment}
          tier={tier}
          products={stripeProducts}
        />
      </div>
      <CreditTracker
        tier={tier}
        credits={numericCredits}
      />
    </>
  )
}

export default BillingDashboard
