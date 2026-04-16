import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { extractText } from 'npm:unpdf'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const CHUNK_SIZE = 1000    // characters per chunk
const CHUNK_OVERLAP = 100  // overlap between adjacent chunks

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Split text into overlapping chunks, recording character positions
function chunkText(text: string): { content: string; from: number; to: number }[] {
  const chunks: { content: string; from: number; to: number }[] = []
  let i = 0
  while (i < text.length) {
    const to = Math.min(i + CHUNK_SIZE, text.length)
    const content = text.slice(i, to).trim()
    if (content.length > 20) { // skip near-empty chunks
      chunks.push({ content, from: i, to })
    }
    if (to === text.length) break
    i += CHUNK_SIZE - CHUNK_OVERLAP
  }
  return chunks
}

// Embed a single string with OpenAI text-embedding-3-small (1536 dims)
async function embed(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: text, model: 'text-embedding-3-small' }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI embed error: ${err}`)
  }
  const json = await res.json()
  return json.data[0].embedding as number[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Authenticate the calling user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing authorization header')

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) throw new Error('Invalid token')

    const user_id = user.id

    // 1. Download CV from storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('cvs')
      .download(`${user_id}/cv.pdf`)

    if (downloadError || !fileBlob) throw new Error('CV not found in storage')

    // 2. Parse PDF text
    const buffer = await fileBlob.arrayBuffer()
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true })

    if (!text || text.trim().length === 0) {
      throw new Error('Could not extract text from PDF')
    }

    // 3. Delete any existing embeddings for this user
    const { error: deleteError } = await supabase
      .from('usercvs')
      .delete()
      .contains('metadata', { user_id })

    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`)

    // 4. Chunk the text
    const chunks = chunkText(text)
    if (chunks.length === 0) throw new Error('No usable text chunks from PDF')

    // 5. Embed each chunk and build rows
    const rows = []
    for (const chunk of chunks) {
      const embedding = await embed(chunk.content)
      rows.push({
        content: chunk.content,
        embedding,
        metadata: {
          user_id,
          source: 'blob',
          blobType: 'text/plain',
          loc: { from: chunk.from, to: chunk.to },
        },
      })
    }

    // 6. Insert all rows
    const { error: insertError } = await supabase.from('usercvs').insert(rows)
    if (insertError) throw new Error(`Insert failed: ${insertError.message}`)

    return new Response(
      JSON.stringify({ success: true, chunks: rows.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('process-cv error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
