import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'alerts@contracthub.co.uk'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://contracthub.co.uk'

interface NewContractPayload {
  type: 'INSERT'
  table: string
  schema: string
  record: {
    id: number
    created_at: string
    JobTitle: string | null
    Company: string | null
    Location: string | null
    WorkType: string | null
    EmploymentType: string | null
    Description: string | null
    URL: string | null
  }
}

Deno.serve(async (req) => {
  try {
    const payload: NewContractPayload = await req.json()

    // Only act on INSERT events
    if (payload.type !== 'INSERT') {
      return new Response('OK', { status: 200 })
    }

    const contract = payload.record
    const searchText = [contract.JobTitle, contract.Company, contract.Location, contract.Description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    // Use service role to query alerts + user emails
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all enabled alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('id, user_id, keywords')
      .eq('enabled', true)

    if (alertsError) throw alertsError
    if (!alerts || alerts.length === 0) return new Response('OK', { status: 200 })

    // Find alerts whose keywords match this contract
    const matched: Array<{ alertId: number; userId: string; keywords: string }> = []
    for (const alert of alerts) {
      const terms = alert.keywords.toLowerCase().split(/[\s,]+/).filter(Boolean)
      const matches = terms.some((term: string) => searchText.includes(term))
      if (matches) {
        matched.push({ alertId: alert.id, userId: alert.user_id, keywords: alert.keywords })
      }
    }

    if (matched.length === 0) return new Response('OK', { status: 200 })

    // Dedupe by user (one email per user, even if multiple alerts matched)
    const userMap = new Map<string, string[]>()
    for (const m of matched) {
      const existing = userMap.get(m.userId) ?? []
      userMap.set(m.userId, [...existing, m.keywords])
    }

    // Fetch user emails from auth.users
    const userIds = [...userMap.keys()]
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
    if (usersError) throw usersError

    const emailMap = new Map<string, string>()
    for (const u of users.users) {
      if (userIds.includes(u.id) && u.email) {
        emailMap.set(u.id, u.email)
      }
    }

    // Send emails via Resend
    const sendPromises = [...userMap.entries()].map(async ([userId, matchedKeywords]) => {
      const email = emailMap.get(userId)
      if (!email) return

      const keywordList = matchedKeywords.join(', ')
      const jobTitle = contract.JobTitle ?? 'New Contract'
      const company = contract.Company ? ` at ${contract.Company}` : ''
      const location = contract.Location ? ` — ${contract.Location}` : ''
      const contractUrl = contract.URL ?? `${SITE_URL}/contracts`

      const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New contract match</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a2e;">
  <div style="background: #f8f9ff; border-radius: 12px; padding: 24px; border: 1px solid #e2e4f0;">
    <p style="font-size: 12px; color: #6b7280; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">New Contract Alert</p>
    <h1 style="font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #1a1a2e;">${jobTitle}${company}</h1>
    <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0;">${location.trim() || 'Location not specified'}</p>

    ${contract.Description ? `
    <div style="background: white; border-radius: 8px; padding: 16px; border: 1px solid #e2e4f0; margin-bottom: 20px;">
      <p style="font-size: 13px; color: #374151; margin: 0; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;">
        ${contract.Description.slice(0, 400)}${contract.Description.length > 400 ? '...' : ''}
      </p>
    </div>` : ''}

    <a href="${contractUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600;">
      View Contract →
    </a>
  </div>

  <p style="font-size: 12px; color: #9ca3af; margin-top: 20px; text-align: center;">
    You're receiving this because you set up an alert for: <strong>${keywordList}</strong><br>
    <a href="${SITE_URL}/alerts" style="color: #4f46e5;">Manage your alerts</a>
  </p>
</body>
</html>`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: `New contract: ${jobTitle}${company}`,
          html: htmlBody,
        }),
      })

      // Increment match_count for each matched alert
      for (const m of matched.filter((x) => x.userId === userId)) {
        await supabase
          .from('alerts')
          .update({ match_count: supabase.rpc('increment', { row_id: m.alertId }) })
          .eq('id', m.alertId)
      }
    })

    await Promise.allSettled(sendPromises)

    return new Response(JSON.stringify({ sent: userMap.size }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-new-contract error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
