import React from 'react'
import Stripe from 'stripe'
import { currentUser } from '@clerk/nextjs'
import { db } from '@/lib/db'
import BillingDashboard from './_components/billing-dashboard'

type Props = {
  searchParams?: { [key: string]: string | undefined }
}

const Billing = async (props: Props) => {
  const { session_id } = props.searchParams ?? {}

  if (session_id && process.env.STRIPE_SECRET) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET, {
        typescript: true,
        apiVersion: '2023-10-16',
      })

      const session = await stripe.checkout.sessions.listLineItems(session_id)
      const user = await currentUser()

      if (user && session.data.length > 0) {
        const description = session.data[0].description ?? ''
        const credits =
          description === 'Unlimited' ? 'Unlimited' : description === 'Pro' ? '100' : '10'

        await db.user.update({
          where: { clerkId: user.id },
          data: { tier: description, credits },
        })
      }
    } catch (error) {
      console.error('Billing session error:', error)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sticky top-0 z-[10] flex items-center justify-between border-b bg-background/50 p-6 text-4xl backdrop-blur-lg">
        <span>Billing</span>
      </h1>
      <BillingDashboard />
    </div>
  )
}

export default Billing
