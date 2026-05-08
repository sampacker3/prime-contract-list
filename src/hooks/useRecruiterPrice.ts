// Recruiter plan: £175/month flat rate
// When you create the Stripe price, set VITE_STRIPE_RECRUITER_PRICE_ID in your .env
// and wire it to a `get-recruiter-price` Supabase Edge Function if dynamic pricing is needed.
// For now this hook returns the static price.

export type RecruiterPriceData = {
  amount: number    // 17500 (pence)
  currency: string  // 'gbp'
  interval: string  // 'month'
}

export function useRecruiterPrice() {
  const priceData: RecruiterPriceData = {
    amount: 17500,
    currency: 'gbp',
    interval: 'month',
  }

  return {
    priceData,
    priceString: '£175/month',
    isLoading: false,
  }
}
