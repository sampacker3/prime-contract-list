import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { sendRedditEvent } from '../_shared/reddit.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })

  const body = await req.text()

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (!userId) break

        const subscriptionId = session.subscription as string
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const renewsAt = new Date(subscription.current_period_end * 1000).toISOString()

        // If the subscription is in trial, record when it ends
        const trialEndsAt = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null

        await supabase.from('profiles').upsert({
          id: userId,
          subscription_plan: 'pro',
          subscription_active: true,
          subscription_renews_at: renewsAt,
          stripe_customer_id: session.customer as string,
          trial_ends_at: trialEndsAt,
        }, { onConflict: 'id' })

        // Reddit CAPI: only fire Purchase on actual payment, not trial start
        if (!trialEndsAt) {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId)
          await sendRedditEvent({
            type:       'Purchase',
            email:      authUser?.email,
            externalId: userId,
            value:      session.amount_total ? session.amount_total / 100 : 29.99,
            currency:   (session.currency ?? 'gbp').toUpperCase(),
            eventId:    `purchase_${userId}_${session.id}`,
          })
        }

        console.log(`✅ Subscription activated for user ${userId}${trialEndsAt ? ' (trial)' : ''}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id, trial_ends_at')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        const isActive = subscription.status === 'active' || subscription.status === 'trialing'
        const renewsAt = new Date(subscription.current_period_end * 1000).toISOString()

        // Clear trial_ends_at when the subscription moves from trialing → active (first real charge)
        const wasOnTrial = !!profile.trial_ends_at
        const nowActive  = subscription.status === 'active'
        const trialEndsAt = subscription.trial_end && subscription.status === 'trialing'
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null

        await supabase.from('profiles').update({
          subscription_active: isActive,
          subscription_plan: isActive ? 'pro' : 'free',
          subscription_renews_at: isActive ? renewsAt : null,
          trial_ends_at: trialEndsAt,
        }).eq('id', profile.id)

        // Fire Reddit Purchase when trial converts to paid (first real charge)
        if (wasOnTrial && nowActive) {
          const { data: { user: authUser } } = await supabase.auth.admin.getUserById(profile.id)
          await sendRedditEvent({
            type:       'Purchase',
            email:      authUser?.email,
            externalId: profile.id,
            value:      29.99,
            currency:   'GBP',
            eventId:    `purchase_trial_convert_${profile.id}`,
          })
        }

        console.log(`🔄 Subscription updated for customer ${customerId}: ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          subscription_active: false,
          subscription_plan: 'free',
          subscription_renews_at: null,
          trial_ends_at: null,
        }).eq('id', profile.id)

        console.log(`❌ Subscription cancelled for customer ${customerId}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          subscription_active: false,
        }).eq('id', profile.id)

        console.log(`⚠️ Payment failed for customer ${customerId}`)
        break
      }

      // Newer Stripe API versions send invoice_payment.paid instead of invoice.payment_succeeded
      case 'invoice_payment.paid': {
        const invoicePayment = event.data.object as { customer?: string; status?: string }
        const customerId = invoicePayment.customer as string
        if (!customerId) break

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) break

        await supabase.from('profiles').update({
          subscription_active: true,
        }).eq('id', profile.id)

        console.log(`✅ Invoice paid for customer ${customerId}`)
        break
      }

      default:
        console.log(`Unhandled event: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
