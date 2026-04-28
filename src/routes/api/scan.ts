import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const InputSchema = z.object({
  imageBase64: z.string().min(100).max(10_000_000),
  mode: z.enum(['list', 'shelf', 'bottle']).optional(),
  buyingFor: z.enum(['me', 'group', 'gift']).optional(),
})

async function requireAuth(request: Request): Promise<string | Response> {
  const SUPABASE_URL = process.env.SUPABASE_URL
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return new Response(JSON.stringify({ error: 'Auth not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'Sign in required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase.auth.getClaims(token)
  if (error || !data?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return data.claims.sub as string
}

const PROMPT = `You are a wine expert analyzing an image of a wine list, wine shelf, or single bottle.

Extract every wine you can read in the image, up to 12. Return a single JSON array of wine objects.

GROUNDING RULES — important:
- The "name" field MUST be a wine you can actually see in the image. Do not invent wines that aren't there.
- If only part of a name is visible, return what you can read (e.g. "Château Margaux" without vintage is fine).
- It is OK to be generous about including wines — partial reads are welcome — but the name must come from the image, not from memory.
- For each wine, include a "confidence" score (0-100) reflecting how clearly you could read the name on the image. Lower it for blurry/partial labels, but still include the wine.

OUTPUT RULES:
- Output RAW JSON only. NO markdown. NO code fences. NO triple backticks. NO "json" labels.
- Return exactly one JSON array, even if empty.
- No preamble, no commentary, no trailing summary.
- Stop after 12 wines.

Field rules — use what you can SEE for factual fields; use sensible defaults for the rest:
- id: integer starting at 1
- name: string — REQUIRED. The producer + cuvée as printed on the label/list. Must be readable in the image.
- vintage: string — the year printed on the label, "NV" if non-vintage is shown, or "" (empty) if not visible. Do NOT guess.
- region: string — if printed on the label/list. If not printed but the wine is well-known and you are confident, you may include it; otherwise "".
- grape: string — if printed, or if obvious from a single-varietal wine you recognize from the label; otherwise "".
- price: string — only if a price is shown next to the wine (e.g. "$45"); otherwise "—".
- priceNum: number — numeric price if shown; otherwise 0.
- rating: number 0-100 — leave 0 unless a rating/score is printed.
- ratingLabel: string — "" unless a rating is shown.
- body, sweetness, tannin, acidity: number 0-100 — typical profile for the grape/style if you recognize the wine; otherwise 50.
- isValue: boolean — false unless clearly a value pick.
- isCrowd: boolean — false unless clearly a crowd-pleaser style.
- tasting: string — one short sentence ONLY if you genuinely recognize the wine; otherwise "".
- confidence: number 0-100 — how clearly you could read this wine's name on the image.`

function stripCodeFences(value: string) {
  return value.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
}

function findBalancedJson(text: string, open: '[' | '{', close: ']' | '}') {
  const start = text.indexOf(open)
  if (start === -1) return ''
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < text.length; i += 1) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === open) depth += 1
    else if (c === close) {
      depth -= 1
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return ''
}

function normalizeWine(raw: unknown, index: number) {
  if (!raw || typeof raw !== 'object') return null
  const wine = raw as Record<string, unknown>
  const name = typeof wine.name === 'string' ? wine.name.trim() : ''
  if (!name) return null
  return {
    id: typeof wine.id === 'number' ? wine.id : index + 1,
    name,
    vintage: typeof wine.vintage === 'string' ? wine.vintage : '',
    region: typeof wine.region === 'string' ? wine.region : '',
    grape: typeof wine.grape === 'string' ? wine.grape : '',
    price: typeof wine.price === 'string' ? wine.price : '—',
    priceNum: typeof wine.priceNum === 'number' ? wine.priceNum : 0,
    rating: typeof wine.rating === 'number' ? wine.rating : 0,
    ratingLabel: typeof wine.ratingLabel === 'string' ? wine.ratingLabel : '',
    body: typeof wine.body === 'number' ? wine.body : 50,
    sweetness: typeof wine.sweetness === 'number' ? wine.sweetness : 50,
    tannin: typeof wine.tannin === 'number' ? wine.tannin : 50,
    acidity: typeof wine.acidity === 'number' ? wine.acidity : 50,
    isValue: typeof wine.isValue === 'boolean' ? wine.isValue : false,
    isCrowd: typeof wine.isCrowd === 'boolean' ? wine.isCrowd : false,
    tasting: typeof wine.tasting === 'string' ? wine.tasting : '',
    confidence: typeof wine.confidence === 'number' ? wine.confidence : 50,
  }
}

function parseWinesFromModel(content: string) {
  const text = stripCodeFences(content)
  const candidates = [text, findBalancedJson(text, '[', ']'), findBalancedJson(text, '{', '}')].filter(Boolean)
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.wines) ? parsed.wines : parsed?.name ? [parsed] : []
      const wines = list.map(normalizeWine).filter(Boolean)
      if (wines.length) return wines.slice(0, 12)
    } catch {
      // Try the next extraction strategy.
    }
  }
  return []
}

export const Route = createFileRoute('/api/scan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authResult = await requireAuth(request)
        if (authResult instanceof Response) return authResult

        const apiKey = process.env.LOVABLE_API_KEY
        if (!apiKey) {
          return new Response(JSON.stringify({ error: 'AI not configured' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        let payload: z.infer<typeof InputSchema>
        try {
          const body = await request.json()
          payload = InputSchema.parse(body)
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Invalid input' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const dataUrl = payload.imageBase64.startsWith('data:')
          ? payload.imageBase64
          : `data:image/jpeg;base64,${payload.imageBase64}`

        const abort = new AbortController()
        const timeout = setTimeout(() => abort.abort(), 38_000)
        try {
          const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            signal: abort.signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              stream: false,
              temperature: 0.1,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: PROMPT },
                    { type: 'image_url', image_url: { url: dataUrl } },
                  ],
                },
              ],
            }),
          })

          const raw = await upstream.text().catch(() => '')
          if (!upstream.ok) {
            console.error('AI gateway scan error', upstream.status, raw)
            return new Response(JSON.stringify({ error: 'Vision analysis failed' }), {
              status: 502,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const completion = JSON.parse(raw)
          const content = completion?.choices?.[0]?.message?.content
          const wines = typeof content === 'string' ? parseWinesFromModel(content) : []
          return new Response(JSON.stringify({ wines }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (err) {
          console.error('scan request error', err)
          return new Response(JSON.stringify({ error: 'The scan took too long' }), {
            status: 504,
            headers: { 'Content-Type': 'application/json' },
          })
        } finally {
          clearTimeout(timeout)
        }
      },
    },
  },
})
