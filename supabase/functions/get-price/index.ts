import Stripe from 'https://esm.sh/stripe@14?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
})

const PRICE_ID = Deno.env.get('STRIPE_PRICE_ID') ?? 'price_1TL9ZEB0hXdG8r5X4m42WpR1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const price = await stripe.prices.retrieve(PRICE_ID)

    return new Response(
      JSON.stringify({
        amount: price.unit_amount,           // e.g. 2999
        currency: price.currency,            // e.g. "gbp"
        interval: price.recurring?.interval, // e.g. "month"
        interval_count: price.recurring?.interval_count ?? 1,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('get-price error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
