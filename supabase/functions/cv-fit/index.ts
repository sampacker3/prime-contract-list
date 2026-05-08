import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractText } from 'npm:unpdf'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!
const CACHE_TTL_DAYS = 7

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

    const { contract_id, job_title, description } = await req.json()
    if (!contract_id) throw new Error('contract_id required')

    // 1. Check cache — if hit within TTL, return immediately (free)
    const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 86400 * 1000).toISOString()
    const { data: cached } = await supabase
      .from('cv_fit_cache')
      .select('fit_score, summary')
      .eq('user_id', user.id)
      .eq('contract_id', contract_id)
      .gte('created_at', cutoff)
      .maybeSingle()

    if (cached) {
      return new Response(
        JSON.stringify({ score: cached.fit_score, summary: cached.summary, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Download and extract CV text
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(`${user.id}/cv.pdf`)
    if (downloadError || !fileBlob) throw new Error('CV not found')

    const buffer = await fileBlob.arrayBuffer()
    const { text: cvText } = await extractText(new Uint8Array(buffer), { mergePages: true })
    if (!cvText?.trim()) throw new Error('Could not extract CV text')

    // Trim CV to ~3000 chars to keep tokens low
    const cvTrimmed = cvText.trim().slice(0, 3000)
    const jdTrimmed = `${job_title ?? ''}\n\n${description ?? ''}`.trim().slice(0, 1500)

    // 3. Call GPT-4o mini
    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 80,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a technical recruiter. Given a CV and a job description, return a JSON object with two fields:
- "score": integer 0-100 representing how well the CV matches the job
- "summary": a single sentence of max 15 words explaining the match (e.g. "Strong Python and AWS skills, may lack Terraform experience")
Return ONLY valid JSON, no markdown.`,
          },
          {
            role: 'user',
            content: `CV:\n${cvTrimmed}\n\n---\nJob:\n${jdTrimmed}`,
          },
        ],
      }),
    })

    if (!aiRes.ok) throw new Error(`OpenAI error: ${await aiRes.text()}`)
    const aiJson = await aiRes.json()
    const raw = aiJson.choices?.[0]?.message?.content?.trim() ?? '{}'

    let score: number
    let summary: string
    try {
      const parsed = JSON.parse(raw)
      score = Math.max(0, Math.min(100, Math.round(Number(parsed.score))))
      summary = String(parsed.summary ?? '').slice(0, 120)
    } catch {
      throw new Error('Invalid AI response format')
    }

    // 4. Upsert cache
    await supabase.from('cv_fit_cache').upsert({
      user_id: user.id,
      contract_id,
      fit_score: score,
      summary,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id,contract_id' })

    return new Response(
      JSON.stringify({ score, summary, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('cv-fit error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
