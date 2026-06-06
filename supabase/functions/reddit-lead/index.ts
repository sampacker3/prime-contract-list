/**
 * reddit-lead — server-side Reddit CAPI Lead event
 *
 * Called by the React app right after a user creates a free account.
 * Validates the Supabase JWT, pulls the user's email, and sends a
 * server-side Lead event to Reddit CAPI (bypasses ad blockers).
 *
 * POST /functions/v1/reddit-lead
 * Authorization: Bearer <supabase-user-jwt>
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendRedditEvent } from '../_shared/reddit.ts'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate the calling user's JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Use the user's JWT to get their identity
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: { user }, error } = await userClient.auth.getUser()

    if (error || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorised' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fire server-side Lead event
    await sendRedditEvent({
      type:       'Lead',
      email:      user.email,
      externalId: user.id,
      eventId:    `lead_${user.id}`,   // dedup: same user won't double-fire
    })

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('reddit-lead error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
