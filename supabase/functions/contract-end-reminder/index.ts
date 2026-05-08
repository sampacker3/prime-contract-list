/**
 * contract-end-reminder
 *
 * Scheduled daily via Supabase pg_cron or an external cron hitting:
 *   POST https://<project>.supabase.co/functions/v1/contract-end-reminder
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * To schedule with pg_cron (run once in SQL editor):
 *   select cron.schedule(
 *     'contract-end-reminder',
 *     '0 8 * * *',   -- 8am UTC every day
 *     $$
 *       select net.http_post(
 *         url := 'https://<project-ref>.supabase.co/functions/v1/contract-end-reminder',
 *         headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
 *         body := '{}'::jsonb
 *       )
 *     $$
 *   );
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SMTP_HOST = Deno.env.get('SMTP_HOST')!
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') ?? '587')
const SMTP_USER = Deno.env.get('SMTP_USER')!
const SMTP_PASS = Deno.env.get('SMTP_PASS')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@itcontracthub.co.uk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail(to: string, subject: string, html: string) {
  // Uses SMTP via fetch to a relay, or replace with your preferred email provider
  // Example using Resend API (set RESEND_API_KEY env var):
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `IT ContractHub <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    })
    return
  }
  // Fallback: log (replace with your actual SMTP/email provider)
  console.log(`Would send email to ${to}: ${subject}`)
}

function buildEmailHtml(
  name: string,
  endDate: string,
  daysUntil: number,
  contracts: Array<{ id: number; JobTitle: string | null; Company: string | null; Location: string | null; PayRate: string | null }>
): string {
  const formattedDate = new Date(endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const contractRows = contracts.map(c => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <a href="https://itcontracthub.co.uk/contract/${c.id}" style="color:#2563eb;font-weight:600;text-decoration:none;">
          ${c.JobTitle ?? 'IT Contract Role'}
        </a>
        <br/>
        <span style="color:#6b7280;font-size:13px;">${[c.Company, c.Location, c.PayRate].filter(Boolean).join(' · ')}</span>
      </td>
    </tr>`).join('')

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;max-width:600px;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;">
          <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">IT ContractHub</p>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">Your contract reminder</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">
            ${daysUntil <= 14 ? '⏰' : '📅'} Your contract ends in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}
          </p>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">
            Hi ${name || 'there'}, your current contract ends on <strong>${formattedDate}</strong>.
            Here are some matching contracts to consider now, before the gap hits.
          </p>

          ${contracts.length > 0 ? `
          <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
            Matching contracts right now
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            ${contractRows}
          </table>
          ` : '<p style="color:#6b7280;">No new matching contracts today — check back tomorrow.</p>'}

          <a href="https://itcontracthub.co.uk/contracts"
             style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Browse All Contracts →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:16px 32px;border-top:1px solid #f0f0f0;background:#f9fafb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            You're receiving this because you set a contract end date on IT ContractHub.
            <a href="https://itcontracthub.co.uk/account" style="color:#2563eb;">Update your settings</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Find all users whose contract ends within their notify window
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name, contract_end_date, contract_end_notify_days')
      .not('contract_end_date', 'is', null)

    if (profilesError) throw profilesError

    let emailsSent = 0

    for (const profile of profiles ?? []) {
      const endDate = new Date(profile.contract_end_date)
      endDate.setHours(0, 0, 0, 0)
      const daysUntil = Math.round((endDate.getTime() - today.getTime()) / 86400000)
      const notifyDays = profile.contract_end_notify_days ?? 30

      // Only notify if within their window and not already passed
      if (daysUntil < 0 || daysUntil > notifyDays) continue

      // Only notify at key intervals: on entry into window, at 14 days, at 7 days, at 3 days, at 1 day
      const notifyOn = [notifyDays, 14, 7, 3, 1].filter(d => d <= notifyDays)
      if (!notifyOn.includes(daysUntil)) continue

      // Get user's alert keywords
      const { data: alertRows } = await supabase
        .from('alerts')
        .select('keywords')
        .eq('user_id', profile.id)
        .eq('enabled', true)

      const keywords = (alertRows ?? []).map((r: { keywords: string }) => r.keywords.toLowerCase())

      // Find matching recent contracts (last 7 days)
      const since = new Date(Date.now() - 7 * 86400 * 1000).toISOString()
      const { data: contracts } = await supabase
        .from('LinkedinScrapeResults')
        .select('id, JobTitle, Company, Location, PayRate, Description')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(200)

      // Filter by keyword match
      const matching = (contracts ?? [])
        .filter(c => {
          if (keywords.length === 0) return true
          const haystack = `${c.JobTitle ?? ''} ${c.Description ?? ''}`.toLowerCase()
          return keywords.some(kw => haystack.includes(kw))
        })
        .slice(0, 5)

      const email = profile.email
      if (!email) continue

      const html = buildEmailHtml(
        profile.full_name ?? '',
        profile.contract_end_date,
        daysUntil,
        matching
      )

      await sendEmail(
        email,
        `Your contract ends in ${daysUntil} day${daysUntil !== 1 ? 's' : ''} — ${matching.length} matching contracts available`,
        html
      )
      emailsSent++
    }

    return new Response(
      JSON.stringify({ success: true, emailsSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('contract-end-reminder error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
