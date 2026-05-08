import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractText } from 'npm:unpdf'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )
    if (authError || !user) throw new Error('Invalid token')

    // 1. Download & extract CV text
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(`${user.id}/cv.pdf`)
    if (downloadError || !fileBlob) throw new Error('CV not found in storage')

    const buffer = await fileBlob.arrayBuffer()
    const { text: cvText } = await extractText(new Uint8Array(buffer), { mergePages: true })
    if (!cvText?.trim()) throw new Error('Could not extract CV text')

    // 2. Fetch user's alert keywords (what they're interested in)
    const { data: alertRows } = await supabase
      .from('alerts')
      .select('keywords')
      .eq('user_id', user.id)
      .eq('enabled', true)

    const keywords = (alertRows ?? []).map((r: { keywords: string }) => r.keywords).filter(Boolean)
    const keywordContext = keywords.length > 0
      ? `The user is primarily interested in these types of IT contracts: ${keywords.join(', ')}.`
      : 'No specific contract preferences set.'

    const cvTrimmed = cvText.trim().slice(0, 4000)

    // 3. Call GPT-4o mini for structured review
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 600,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: `You are an expert technical recruiter reviewing a UK IT contractor's CV for contract roles. ${keywordContext}

Return a JSON object with these exact fields:
{
  "headline": "One sentence (max 20 words) overall assessment",
  "score": integer 0-100 overall CV quality score for IT contract market,
  "strengths": array of 3 strings, each max 15 words, specific positive points,
  "gaps": array of 2-3 strings, each max 15 words, specific things missing or weak,
  "quick_wins": array of 2 strings, each max 15 words, specific actionable improvements
}

Be specific and honest. Reference actual skills/experience from the CV. Return ONLY valid JSON, no markdown.`,
          },
          {
            role: 'user',
            content: `CV:\n${cvTrimmed}`,
          },
        ],
      }),
    })

    if (!aiRes.ok) throw new Error(`OpenAI error: ${await aiRes.text()}`)
    const aiJson = await aiRes.json()
    const raw = aiJson.choices?.[0]?.message?.content?.trim() ?? '{}'

    let review: Record<string, unknown>
    try {
      review = JSON.parse(raw)
    } catch {
      throw new Error('Invalid AI response format')
    }

    // 4. Upsert review (one per user)
    const { error: upsertError } = await supabase
      .from('cv_reviews')
      .upsert({
        user_id: user.id,
        review,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

    if (upsertError) throw new Error(`Failed to save review: ${upsertError.message}`)

    return new Response(
      JSON.stringify({ review }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('cv-review error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
