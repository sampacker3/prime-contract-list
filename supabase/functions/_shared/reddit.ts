/**
 * Reddit Conversions API helper (server-side)
 * Shared by stripe-webhook and reddit-lead edge functions.
 *
 * Reddit requires PII to be SHA-256 hashed before sending.
 * Docs: https://ads.reddit.com/help/articles/conversion-api
 */

const REDDIT_ACCESS_TOKEN  = Deno.env.get('REDDIT_ACCESS_TOKEN')!;
const REDDIT_AD_ACCOUNT_ID = Deno.env.get('REDDIT_AD_ACCOUNT_ID')!;
const CAPI_URL = `https://ads-api.reddit.com/api/v2.0/conversions/events/${REDDIT_AD_ACCOUNT_ID}`;

/** SHA-256 hash a string (required by Reddit for all PII fields) */
async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value.toLowerCase().trim()),
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface RedditEvent {
  type: 'Lead' | 'Purchase' | 'SignUp' | 'PageVisit' | 'ViewContent';
  email?: string;
  externalId?: string;   // Supabase user ID
  value?: number;        // e.g. 29.99
  currency?: string;     // e.g. 'GBP'
  eventId?: string;      // dedup key — same ID used in browser pixel
}

/**
 * Send a server-side conversion event to Reddit CAPI.
 * Logs errors but never throws — a failed analytics call should never
 * break the main request flow.
 */
export async function sendRedditEvent(event: RedditEvent): Promise<void> {
  if (!REDDIT_ACCESS_TOKEN || !REDDIT_AD_ACCOUNT_ID) {
    console.warn('Reddit CAPI: missing credentials — skipping');
    return;
  }

  try {
    const user: Record<string, string> = {};
    if (event.email)      user.email       = await sha256(event.email);
    if (event.externalId) user.external_id = await sha256(event.externalId);

    const payload: Record<string, unknown> = {
      test_mode: false,
      events: [{
        event_at:   new Date().toISOString(),
        event_type: { tracking_type: event.type },
        user,
        ...(event.eventId && { event_id: event.eventId }),
        ...(event.value != null && {
          custom_event_fields: {
            value_decimal: event.value,
            currency:      event.currency ?? 'GBP',
          },
        }),
      }],
    };

    const res = await fetch(CAPI_URL, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${REDDIT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Reddit CAPI error ${res.status}:`, text);
    } else {
      console.log(`✅ Reddit CAPI: ${event.type} sent`);
    }
  } catch (err) {
    console.error('Reddit CAPI exception:', err);
  }
}
