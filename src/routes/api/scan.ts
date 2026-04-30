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

// Min confidence (0-100) for a wine to make it into the response.
const MIN_WINE_CONFIDENCE = 45
// If overall recognition rate (kept / total seen) falls below this, mark partial.
const MIN_RECOGNITION_RATE = 0.5

const PROMPT = `You are a wine expert analyzing an image of a wine list, wine shelf, or single bottle.

STEP 1 — READABILITY GATE:
First, judge whether the image is readable enough to extract specific wines.
- "good": at least one full wine label / list line / shelf tag is sharp, well-lit, and clearly readable.
- "partial": you can read fragments but most text is blurry, glare-covered, too far, or cut off.
- "unreadable": no wine text is legible, the image is not of wine, or the frame is too dark/blurry.

If "partial" or "unreadable", populate retakeReasons with 1-3 short, user-friendly reasons from this list ONLY:
"too_blurry", "too_dark", "too_far", "glare", "angle_skewed", "label_cut_off", "not_a_wine_image", "list_too_dense".

STEP 2 — EXTRACT WINES (only the ones you can actually read):
Extract every specific wine you can read in the image, up to 12.

GROUNDING RULES — important:
- The "name" field MUST be a specific wine actually visible in the image. Do not invent wines that aren't there.
- NEVER return OCR fragments, store text, shelf signage, category labels, initials, or single loose words as wines.
- A producer/brand alone is NOT enough unless a visible vintage, grape, region, cuvée, appellation, or price confirms a specific wine.
- If you can only read fragments like "BY", "Cs", "DECO", or a lone producer name, return no wine for that fragment.
- If readability is "unreadable", return an empty wines array.
- For each wine, include a "confidence" score (0-100) reflecting how clearly you could read the name on the image. Lower it for blurry/partial labels, but still include the wine if you are reasonably sure.

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
- confidence: number 0-100 — how clearly you could read this wine's name on the image.
- bbox: object — the bounding box of THIS specific bottle/listing in the image, expressed as normalized values (0..1) of the image dimensions:
    { "x": <left edge 0..1>, "y": <top edge 0..1>, "w": <width 0..1>, "h": <height 0..1> }
  Be as tight as you can around the bottle/listing. If you genuinely cannot localize it, return { "x": 0, "y": 0, "w": 0, "h": 0 }.`

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
  if (compact.length < 5 || words.every((word) => word.length <= 2)) return false
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

function normalizeBbox(raw: unknown): { x: number; y: number; w: number; h: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const x = Number(b.x), y = Number(b.y), w = Number(b.w), h = Number(b.h)
  if (![x, y, w, h].every(Number.isFinite)) return null
  if (w <= 0 || h <= 0) return null
  // Clamp to [0,1]
  const cx = Math.max(0, Math.min(1, x))
  const cy = Math.max(0, Math.min(1, y))
  const cw = Math.max(0, Math.min(1 - cx, w))
  const ch = Math.max(0, Math.min(1 - cy, h))
  if (cw <= 0 || ch <= 0) return null
  return { x: cx, y: cy, w: cw, h: ch }
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
    bbox: normalizeBbox(wine.bbox),
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
      if (wines.length) return wines
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
                              bbox: {
                                type: 'object',
                                properties: {
                                  x: { type: 'number' },
                                  y: { type: 'number' },
                                  w: { type: 'number' },
                                  h: { type: 'number' },
                                },
                                required: ['x', 'y', 'w', 'h'],
                                additionalProperties: false,
                              },
                            },
                            required: ['id', 'name', 'vintage', 'region', 'grape', 'price', 'priceNum', 'rating', 'ratingLabel', 'body', 'sweetness', 'tannin', 'acidity', 'isValue', 'isCrowd', 'tasting', 'confidence', 'bbox'],
                            additionalProperties: false,
                          },
                        },
                        message: { type: 'string' },
                        readability: { type: 'string', enum: ['good', 'partial', 'unreadable'] },
                        retakeReasons: {
                          type: 'array',
                          items: {
                            type: 'string',
                            enum: ['too_blurry', 'too_dark', 'too_far', 'glare', 'angle_skewed', 'label_cut_off', 'not_a_wine_image', 'list_too_dense'],
                          },
                        },
                      },
                      required: ['wines', 'message', 'readability', 'retakeReasons'],
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
          const rawToolWines = Array.isArray(parsedArgs?.wines)
            ? parsedArgs.wines.map(normalizeWine).filter(Boolean)
            : []
          const fallbackWines = typeof message?.content === 'string' ? parseWinesFromModel(message.content) : []
          const allCandidates = (rawToolWines.length ? rawToolWines : fallbackWines) as Array<ReturnType<typeof normalizeWine> & {}>
          const seenCount = allCandidates.length
          // Drop low-confidence wines (post-OCR recognition gate)
          const wines = allCandidates.filter((w) => (w?.confidence ?? 0) >= MIN_WINE_CONFIDENCE).slice(0, 12)
          const recognitionRate = seenCount > 0 ? wines.length / seenCount : 0

          const reportedReadability = typeof parsedArgs?.readability === 'string' ? parsedArgs.readability : ''
          const reportedReasons = Array.isArray(parsedArgs?.retakeReasons)
            ? parsedArgs.retakeReasons.filter((r: unknown) => typeof r === 'string')
            : []

          // Derive a final readability verdict combining the model's self-report with our gate.
          let readability: 'good' | 'partial' | 'unreadable'
          if (!wines.length) {
            readability = reportedReadability === 'unreadable' ? 'unreadable' : 'unreadable'
          } else if (reportedReadability === 'unreadable') {
            readability = 'partial'
          } else if (reportedReadability === 'partial' || recognitionRate < MIN_RECOGNITION_RATE || wines.length === 1) {
            readability = 'partial'
          } else {
            readability = 'good'
          }

          const retakeReasons = readability === 'good' ? [] : reportedReasons
          const userMessage = typeof parsedArgs?.message === 'string' && parsedArgs.message.trim()
            ? parsedArgs.message
            : EMPTY_SCAN_MESSAGE

          const response = wines.length
            ? { wines, readability, retakeReasons, message: readability === 'good' ? '' : userMessage }
            : { wines: [], readability, retakeReasons, message: userMessage }
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
