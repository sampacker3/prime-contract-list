import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') ?? 'price_1TL9ZEB0hXdG8r5X4m42WpR1'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://contracthub.co.uk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate user from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Invalid token')

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    let customerId: string = profile?.stripe_customer_id ?? ''

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    // Accept dynamic URLs from the client (falls back to SITE_URL)
    let body: { success_url?: string; cancel_url?: string } = {}
    try { body = await req.clone().json() } catch (_) { /* no body is fine */ }
    const successUrl = body.success_url ?? `${SITE_URL}/account?checkout=success`
    const cancelUrl = body.cancel_url ?? `${SITE_URL}/account?checkout=cancelled`

    // Check if this customer has already used a trial (don't offer twice)
    const existingSubscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all', // include canceled subs so a cancelled trial can't be re-claimed
      limit: 100,
    })
    const hasUsedTrial = existingSubscriptions.data.some(
      s => s.trial_end != null
    )

    // Create Checkout session — 3-day free trial for first-time subscribers
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { supabase_user_id: user.id },
      ...(!hasUsedTrial && {
        subscription_data: {
          trial_period_days: 3,
          metadata: { supabase_user_id: user.id },
        },
      }),
    })

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-checkout-session error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
