import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = 'https://itcontracthub.co.uk'

const STATIC_URLS = [
  { loc: '/',                  priority: '1.0', changefreq: 'daily'   },
  { loc: '/contracts',         priority: '0.9', changefreq: 'hourly'  },
  { loc: '/day-rates',         priority: '0.8', changefreq: 'weekly'  },
  { loc: '/ir35-calculator',   priority: '0.8', changefreq: 'monthly' },
  { loc: '/about',             priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact',           priority: '0.5', changefreq: 'monthly' },
  { loc: '/contract-sources',  priority: '0.5', changefreq: 'monthly' },
  { loc: '/privacy',           priority: '0.3', changefreq: 'yearly'  },
  { loc: '/terms',             priority: '0.3', changefreq: 'yearly'  },
]

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Fetch all contracts from the last 28 days (before they expire from Google's index)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 28)

  const { data: contracts } = await supabase
    .from('LinkedinScrapeResults')
    .select('id, created_at')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(50000)

  const now = new Date().toISOString()

  const staticEntries = STATIC_URLS.map(u => `
  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${now.slice(0, 10)}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('')

  const contractEntries = (contracts ?? []).map(c => `
  <url>
    <loc>${SITE_URL}/contract/${c.id}</loc>
    <lastmod>${c.created_at.slice(0, 10)}</lastmod>
    <changefreq>never</changefreq>
    <priority>0.7</priority>
  </url>`).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${contractEntries}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
})
