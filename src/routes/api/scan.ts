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

const EMPTY_SCAN_MESSAGE = 'I could not identify a specific wine from this image. Try a closer, sharper photo where the full bottle label, shelf tag, or wine-list line is readable.'

const PROMPT = `You are a wine expert analyzing an image of a wine list, wine shelf, or single bottle.

Extract every specific wine you can read in the image, up to 12.

GROUNDING RULES — important:
- The "name" field MUST be a specific wine actually visible in the image. Do not invent wines that aren't there.
- NEVER return OCR fragments, store text, shelf signage, category labels, initials, or single loose words as wines.
- A producer/brand alone is NOT enough unless a visible vintage, grape, region, cuvée, appellation, or price confirms a specific wine.
- If you can only read fragments like "BY", "Cs", "DECO", or a lone producer name, return no wine for that fragment.
- If no specific wine can be identified, call the tool with an empty wines array and a helpful retake message.
- For each wine, include a "confidence" score (0-100) reflecting how clearly you could read the name on the image. Lower it for blurry/partial labels, but still include the wine.

OUTPUT RULES:
- Use the extract_wines tool only.
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

const WINE_MARKERS = [
  'cabernet', 'chardonnay', 'pinot', 'merlot', 'sauvignon', 'syrah', 'shiraz', 'riesling', 'malbec',
  'zinfandel', 'grenache', 'tempranillo', 'sangiovese', 'nebbiolo', 'mourvedre', 'chenin', 'viognier',
  'rose', 'rosé', 'brut', 'prosecco', 'champagne', 'cava', 'moscato', 'chianti', 'rioja', 'bordeaux',
  'burgundy', 'bourgogne', 'napa', 'sonoma', 'loire', 'rhone', 'rhône', 'barolo', 'barbaresco',
  'brunello', 'beaujolais', 'sancerre', 'chablis', 'riesling', 'reserve', 'reserva', 'estate', 'vineyard',
  'chateau', 'château', 'domaine', 'cellars', 'winery', 'cuvee', 'cuvée', 'doc', 'docg', 'ava', 'grand cru',
]

function clamp(n: unknown, fallback = 50) {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(0, Math.min(100, Math.round(v)))
}

function hasWineMarker(value: string) {
  const haystack = value.toLowerCase()
  return WINE_MARKERS.some((marker) => haystack.includes(marker))
}

function hasEnoughSpecificity(wine: Record<string, unknown>, name: string) {
  const words = name.split(/\s+/).filter(Boolean)
  const compact = name.replace(/[^a-z0-9]/gi, '')
  if (compact.length < 5 || words.some((word) => word.length <= 2)) return false
  const support = [wine.vintage, wine.region, wine.grape, wine.tasting, wine.price, wine.ratingLabel]
    .filter((v) => typeof v === 'string' && v.trim() && v !== '—')
    .join(' ')
  const combined = `${name} ${support}`
  const vintageVisible = typeof wine.vintage === 'string' && /^(19|20)\d{2}|NV$/i.test(wine.vintage.trim())
  const hasPrice = typeof wine.price === 'string' && /\d/.test(wine.price)
  const hasRating = typeof wine.rating === 'number' && wine.rating > 0

  if (words.length >= 3) return true
  if (words.length >= 2 && hasWineMarker(combined)) return true
  if (words.length >= 2 && (vintageVisible || hasPrice || hasRating)) return true
  return false
}

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
  if (!hasEnoughSpecificity(wine, name)) return null
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
    body: clamp(wine.body),
    sweetness: clamp(wine.sweetness),
    tannin: clamp(wine.tannin),
    acidity: clamp(wine.acidity),
    isValue: typeof wine.isValue === 'boolean' ? wine.isValue : false,
    isCrowd: typeof wine.isCrowd === 'boolean' ? wine.isCrowd : false,
    tasting: typeof wine.tasting === 'string' ? wine.tasting : '',
    confidence: clamp(wine.confidence),
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

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
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
              model: 'google/gemini-3-flash-preview',
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
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'extract_wines',
                    description: 'Return only specific wines visible in the image, or an empty result with retake guidance.',
                    parameters: {
                      type: 'object',
                      properties: {
                        wines: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'number' },
                              name: { type: 'string' },
                              vintage: { type: 'string' },
                              region: { type: 'string' },
                              grape: { type: 'string' },
                              price: { type: 'string' },
                              priceNum: { type: 'number' },
                              rating: { type: 'number' },
                              ratingLabel: { type: 'string' },
                              body: { type: 'number' },
                              sweetness: { type: 'number' },
                              tannin: { type: 'number' },
                              acidity: { type: 'number' },
                              isValue: { type: 'boolean' },
                              isCrowd: { type: 'boolean' },
                              tasting: { type: 'string' },
                              confidence: { type: 'number' },
                            },
                            required: ['id', 'name', 'vintage', 'region', 'grape', 'price', 'priceNum', 'rating', 'ratingLabel', 'body', 'sweetness', 'tannin', 'acidity', 'isValue', 'isCrowd', 'tasting', 'confidence'],
                            additionalProperties: false,
                          },
                        },
                        message: { type: 'string' },
                      },
                      required: ['wines', 'message'],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: 'function', function: { name: 'extract_wines' } },
            }),
          })

          const raw = await upstream.text().catch(() => '')
          if (!upstream.ok) {
            console.error('AI gateway scan error', upstream.status, raw)
            const userError = upstream.status === 429
              ? 'AI is busy right now — please try again in a moment.'
              : upstream.status === 402
                ? 'AI credits are exhausted. Add credits in Settings → Workspace → Usage.'
                : 'Vision analysis failed'
            return new Response(JSON.stringify({ error: userError }), {
              status: upstream.status === 429 || upstream.status === 402 ? upstream.status : 502,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const completion = safeJsonParse(raw)
          const message = completion?.choices?.[0]?.message
          const argsRaw = message?.tool_calls?.[0]?.function?.arguments
          const parsedArgs = typeof argsRaw === 'string' ? safeJsonParse(argsRaw) : null
          const toolWines = Array.isArray(parsedArgs?.wines)
            ? parsedArgs.wines.map(normalizeWine).filter(Boolean).slice(0, 12)
            : []
          const fallbackWines = typeof message?.content === 'string' ? parseWinesFromModel(message.content) : []
          const wines = toolWines.length ? toolWines : fallbackWines
          const response = wines.length
            ? { wines }
            : { wines: [], message: typeof parsedArgs?.message === 'string' && parsedArgs.message.trim() ? parsedArgs.message : EMPTY_SCAN_MESSAGE }
          return new Response(JSON.stringify(response), {
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
