import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContractResult {
  id: number
  JobTitle: string | null
  Company: string | null
  Location: string | null
  PayRate: string | null
  IR35Status: string | null
}

interface SearchContractsParams {
  keywords?: string
  location?: string
  ir35_status?: 'Inside IR35' | 'Outside IR35'
  limit?: number
}

async function searchContracts(params: SearchContractsParams): Promise<ContractResult[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let query = supabase
    .from('LinkedinScrapeResults')
    .select('id, JobTitle, Company, Location, PayRate, IR35Status')
    .order('created_at', { ascending: false })

  if (params.keywords) {
    // Search across JobTitle and Description using ilike
    const kw = `%${params.keywords}%`
    query = query.or(`JobTitle.ilike.${kw},Description.ilike.${kw}`)
  }

  if (params.location) {
    query = query.ilike('Location', `%${params.location}%`)
  }

  if (params.ir35_status) {
    query = query.ilike('IR35Status', `%${params.ir35_status}%`)
  }

  const limit = Math.min(params.limit ?? 5, 5)
  query = query.limit(limit)

  const { data, error } = await query

  if (error) {
    console.error('searchContracts error:', error)
    return []
  }

  return (data ?? []) as ContractResult[]
}

const SYSTEM_PROMPT = `You are a friendly and knowledgeable UK IT contract job assistant for IT ContractHub.
You help contractors find relevant IT contract roles in the UK.

When a user asks you to find, search, show, or list contracts or roles, always use the search_contracts tool to fetch real data from the database.
When presenting results, be concise and helpful. Mention key details like pay rate and IR35 status.
If no results are found, suggest broadening the search or trying different keywords.

You understand UK contracting concepts like IR35, day rates, inside/outside IR35, umbrella companies, and Ltd company contracts.
Keep responses friendly, concise and professional. Use British English spelling.`

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_contracts',
      description: 'Search for IT contract roles in the database. Use this whenever the user asks to find, show, or list contracts or roles.',
      parameters: {
        type: 'object',
        properties: {
          keywords: {
            type: 'string',
            description: 'Keywords to search in job title and description (e.g. "Python", "DevOps", "React developer")',
          },
          location: {
            type: 'string',
            description: 'Location to filter by (e.g. "London", "Manchester", "Remote")',
          },
          ir35_status: {
            type: 'string',
            enum: ['Inside IR35', 'Outside IR35'],
            description: 'Filter by IR35 status',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results to return (max 5)',
          },
        },
        required: [],
      },
    },
  },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // Optional auth — chat is open to all, but we validate if header is present
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error: authError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      )
      // We don't block on auth failure — just log it
      if (authError) {
        console.warn('Auth validation failed (non-blocking):', authError.message)
      }
    }

    const body = await req.json()
    const messages: { role: string; content: string }[] = body.messages ?? []

    if (!messages.length) {
      throw new Error('No messages provided')
    }

    // First OpenAI call
    const firstRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 600,
      }),
    })

    if (!firstRes.ok) {
      const errText = await firstRes.text()
      throw new Error(`OpenAI error: ${errText}`)
    }

    const firstJson = await firstRes.json()
    const firstChoice = firstJson.choices?.[0]
    const assistantMessage = firstChoice?.message

    // Check if there's a tool call
    if (firstChoice?.finish_reason === 'tool_calls' && assistantMessage?.tool_calls?.length) {
      const toolCall = assistantMessage.tool_calls[0]
      const toolName = toolCall.function.name
      const toolArgs: SearchContractsParams = JSON.parse(toolCall.function.arguments ?? '{}')

      let contracts: ContractResult[] = []
      let toolResult = ''

      if (toolName === 'search_contracts') {
        contracts = await searchContracts(toolArgs)
        if (contracts.length === 0) {
          toolResult = 'No contracts found matching those criteria.'
        } else {
          toolResult = JSON.stringify(contracts)
        }
      }

      // Second OpenAI call with tool result
      const secondRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages,
            assistantMessage,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolResult,
            },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      })

      if (!secondRes.ok) {
        const errText = await secondRes.text()
        throw new Error(`OpenAI error (second call): ${errText}`)
      }

      const secondJson = await secondRes.json()
      const finalMessage = secondJson.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.'

      return new Response(
        JSON.stringify({ message: finalMessage, contracts }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No tool call — plain response
    const message = assistantMessage?.content ?? 'Sorry, I could not generate a response.'
    return new Response(
      JSON.stringify({ message, contracts: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('chat-assistant error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
