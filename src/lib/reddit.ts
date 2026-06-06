/**
 * Reddit Pixel helper
 * Pixel ID: a2_j0vl748fm0hq
 *
 * Usage:
 *   rdtTrack('PageVisit')
 *   rdtTrack('Lead')
 *   rdtTrack('Purchase', { value: 29.99, currency: 'GBP' })
 *   rdtIdentify(email, userId)   // call after login/signup for advanced matching
 */

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rdt?: (...args: any[]) => void;
  }
}

const PIXEL_ID = 'a2_j0vl748fm0hq';

/**
 * Re-initialise the pixel with advanced matching data.
 * Call this as soon as you know the user's email / ID (e.g. after signup or login).
 * Reddit uses this to match site visitors to Reddit accounts, improving attribution.
 */
export function rdtIdentify(email?: string, externalId?: string) {
  if (typeof window === 'undefined' || !window.rdt) return;
  window.rdt('init', PIXEL_ID, {
    ...(email     && { email }),
    ...(externalId && { externalId }),
  });
}

/**
 * Fire a Reddit Pixel event.
 * Standard events: PageVisit | Lead | Purchase | ViewContent | AddToCart | SignUp
 */
export function rdtTrack(
  event: 'PageVisit' | 'Lead' | 'Purchase' | 'ViewContent' | 'AddToCart' | 'SignUp' | string,
  data?: Record<string, unknown>,
) {
  if (typeof window === 'undefined' || !window.rdt) return;
  if (data) {
    window.rdt('track', event, data);
  } else {
    window.rdt('track', event);
  }
}
