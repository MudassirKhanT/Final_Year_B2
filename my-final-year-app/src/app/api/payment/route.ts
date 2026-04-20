import { NextResponse, NextRequest } from 'next/server'
import Stripe from 'stripe'

const BASE_URL = process.env.NEXT_PUBLIC_URL ?? 'https://localhost:3000'

function getStripe() {
  if (!process.env.STRIPE_SECRET) {
    throw new Error('STRIPE_SECRET environment variable is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET, {
    typescript: true,
    apiVersion: '2023-10-16',
  })
}

export async function GET(req: NextRequest) {
  try {
    const stripe = getStripe()
    const products = await stripe.prices.list({ limit: 3 })
    return NextResponse.json(products.data)
  } catch (error: any) {
    console.error('Stripe GET error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe()
    const data = await req.json()

    if (!data.priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: data.priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${BASE_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/billing`,
    })

    return NextResponse.json(session.url)
  } catch (error: any) {
    console.error('Stripe POST error:', error)
    return NextResponse.json(
      { error: error.message ?? 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
