import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// ─── Catalog enrichment ───────────────────────────────────────────────────────
// After Claude identifies wines from the image, we look each one up in the
// wine_catalog table (seeded from Kaggle + HuggingFace) to get:
//   • quality_score  — honest 0-100 (85+ = confident pick)
//   • palate axes    — body/sweetness/tannin/acidity from real data
//
// Lookups run in parallel using pg_trgm fuzzy matching.

async function enrichWinesFromCatalog<T extends {
  name:      string
  vintage?:  string
  body:      number
  sweetness: number
  tannin:    number
  acidity:   number
}>(
  wines: T[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<(T & { qualityScore: number; catalogConfidence: 'catalog' | 'inferred' | 'unknown' })[]> {
  const sb = createClient(supabaseUrl, supabaseKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  })

  return Promise.all(
    wines.map(async (wine) => {
      // Parse vintage year from the string field ("2021", "NV", "")
      const vintageNum = /^(19|20)\d{2}$/.test(wine.vintage ?? '')
        ? parseInt(wine.vintage as string, 10)
        : null

      const { data, error } = await sb.rpc('lookup_wine', {
        p_name:      wine.name,
        p_vintage:   vintageNum,
        p_threshold: 0.25,
      })

      if (error) {
        console.error('[catalog] lookup_wine error for', JSON.stringify(wine.name), ':', error.message || JSON.stringify(error))
      }
      if (error || !data?.length) {
        if (!error) console.log('[catalog] no match for', JSON.stringify(wine.name), 'vintage', vintageNum)
        // No catalog match — keep Claude's inferred palate axes, quality unknown
        return { ...wine, qualityScore: 50, catalogConfidence: 'inferred' as const }
      }
      console.log('[catalog] matched', JSON.stringify(wine.name), '→', JSON.stringify(data[0]?.name), 'sim', data[0]?.similarity?.toFixed(3), 'quality', data[0]?.quality_score)

      const match = data[0]
      return {
        ...wine,
        // Prefer catalog palate axes; fall back to Claude's inference
        body:      match.body      ?? wine.body,
        sweetness: match.sweetness ?? wine.sweetness,
        tannin:    match.tannin    ?? wine.tannin,
        acidity:   match.acidity   ?? wine.acidity,
        // Honest quality score from catalog
        qualityScore:       match.quality_score ?? 50,
        catalogConfidence:  'catalog' as const,
        // Enrich metadata when not already present
        region:  wine['region'] || match.region || '',
        grape:   wine['grape']  || match.grape  || '',
        color:   wine['color']  || match.color  || '',
      }
    })
  )
}

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
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) {
    return new Response(JSON.stringify({ error: 'Invalid session' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return data.user.id as string
}

const EMPTY_SCAN_MESSAGE = 'I could not identify a specific wine from this image. Try a closer, sharper photo where the full bottle label, shelf tag, or wine-list line is readable.'

// Min confidence (0-100) for a wine to make it into the response.
const MIN_WINE_CONFIDENCE = 5
// If overall recognition rate (kept / total seen) falls below this, mark partial.
const MIN_RECOGNITION_RATE = 0.3

const PROMPT = `You are a wine expert analyzing an image of a wine list, wine shelf, or single bottle.

STEP 1 — READABILITY CHECK:
First, judge whether the image is readable enough to extract specific wines.
- "good": at least one full wine label / list line / shelf tag is sharp, well-lit, and clearly readable.
- "partial": you can read fragments but most text is blurry, glare-covered, too far, or cut off.
- "unreadable": no wine text is legible, the image is not of wine, or the frame is too dark/blurry.

If "partial" or "unreadable", populate retakeReasons with 1-3 short, user-friendly reasons from this list ONLY:
"too_blurry", "too_dark", "too_far", "glare", "angle_skewed", "label_cut_off", "not_a_wine_image", "list_too_dense".

STEP 2 — EXTRACT WINES (extract even if readability is partial):
Scan the image SYSTEMATICALLY, top-to-bottom and left-to-right. Do not stop early. If there are 30 readable bottles or list lines, return all 30. Be generous: when in doubt about a partially legible wine, include it with a lower confidence score rather than dropping it.

GROUNDING RULES:
- The "name" field should be a wine actually visible in the image. Read it off the label, list line, or shelf tag — do not invent wines from store context or general knowledge.
- If you can read most of a wine name and at least one supporting detail (vintage, region, grape, producer, price), include it. Lower the confidence if the read is partial.
- Avoid returning OCR fragments, store signage, category labels, or single loose words as wines.
- A producer/brand alone is okay if there's any other supporting detail (vintage, grape, region, price, cuvée). If only an isolated brand word is visible with nothing else, leave it out.
- Only return an empty wines array when absolutely no wine producer, cuvée, varietal, region, vintage, shelf tag, or list line can be read.
- For each wine, include a "confidence" score (0-100) reflecting how clearly you could read it. Use lower scores (20-40) for partial reads — they will be kept and shown to the user with a "we may have read this wrong" warning.

OUTPUT RULES:
- Use the extract_wines tool only.
- Return every wine you can confidently read — no upper limit. Err on the side of completeness for wines that ARE visible, but never invent ones that aren't.

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
- color: string — one of "red", "white", "rose", "sparkling", "dessert" if obvious from the label/list (e.g. "Rosé", "Brut", "Champagne", grape color); otherwise "".
- maker: string — the producer/winery name (e.g. "Caymus", "Château Margaux"). Read it off the label. If only a brand line is visible, use that. Otherwise "".
- certifications: array of strings — any of "natural", "biodynamic", "organic", "low_sulfite" ONLY if explicitly printed on the label (e.g. "USDA Organic", "Demeter Biodynamic", "Vin Méthode Nature"). Empty array if nothing is shown.
- bbox: object — the bounding box of THIS specific bottle/listing in the image, expressed as normalized values (0..1) of the image dimensions:
    { "x": <left edge 0..1>, "y": <top edge 0..1>, "w": <width 0..1>, "h": <height 0..1> }
  Cover the FULL bottle from the top of the capsule/cork to the base, and include the entire label width — don't crop tightly to the label only. If you genuinely cannot localize it, return { "x": 0, "y": 0, "w": 0, "h": 0 }.`

const RESCUE_PROMPT = `The previous structured extraction found no wines. This is a MAXIMUM-LENIENCY rescue pass for a wine app.

Return JSON only in this exact shape: {"wines":[...]}. Include EVERY possible wine candidate:
- Any partial producer name, even 2-3 characters of a brand
- Any bottle you recognize visually by label design, bottle shape, or color — even if text is unclear
- Any shelf tag, price tag, or signage near a bottle that includes a wine name
- Any word combination that looks like it could be a wine producer or cuvée name
- Do NOT return empty if you can see ANY wine bottles at all

Return at confidence 5-25 for very uncertain reads. It is better to return 10 uncertain wines than 0 certain wines.

Each wine object must include: id, name, vintage, region, grape, price, priceNum, rating, ratingLabel, body, sweetness, tannin, acidity, isValue, isCrowd, tasting, confidence, color, maker, certifications, bbox.

Use confidence 5-25 for partial/uncertain reads. For bottles recognized visually, set tasting to "label partially visible". Use empty strings, 0, false, [], and bbox {"x":0,"y":0,"w":0,"h":0} when details are not visible.`

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
  // Reject only obvious junk: empty, very short, or single tiny word fragments.
  if (compact.length < 4) return false
  if (words.length === 1 && words[0].length <= 3) return false
  const support = [wine.vintage, wine.region, wine.grape, wine.tasting, wine.price, wine.ratingLabel, wine.maker]
    .filter((v) => typeof v === 'string' && v.trim() && v !== '—')
    .join(' ')
  const combined = `${name} ${support}`
  const vintageVisible = typeof wine.vintage === 'string' && /^(19|20)\d{2}|NV$/i.test(wine.vintage.trim())
  const hasPrice = typeof wine.price === 'string' && /\d/.test(wine.price)
  const hasRating = typeof wine.rating === 'number' && wine.rating > 0
  const hasMaker = typeof wine.maker === 'string' && wine.maker.trim().length >= 3
  const hasSupport = support.trim().length > 0

  // Be generous: any of these signals is enough to keep the wine.
  if (words.length >= 2) return true
  if (hasMaker) return true
  if (hasWineMarker(combined)) return true
  if (vintageVisible || hasPrice || hasRating) return true
  if (hasSupport) return true
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
    color: typeof wine.color === 'string' ? wine.color : '',
    maker: typeof wine.maker === 'string' ? wine.maker : '',
    certifications: Array.isArray(wine.certifications)
      ? wine.certifications.filter((c: unknown): c is string =>
          typeof c === 'string' && ['natural','biodynamic','organic','low_sulfite'].includes(c))
      : [],
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

function extractCandidatesFromCompletion(raw: string) {
  const completion = safeJsonParse(raw)
  const message = completion?.choices?.[0]?.message
  const argsRaw = message?.tool_calls?.[0]?.function?.arguments
  const parsedArgs = typeof argsRaw === 'string'
    ? safeJsonParse(argsRaw)
    : argsRaw && typeof argsRaw === 'object'
      ? argsRaw
      : null
  const rawToolWines = Array.isArray(parsedArgs?.wines)
    ? parsedArgs.wines.map(normalizeWine).filter(Boolean)
    : []
  const contentWines = typeof message?.content === 'string' ? parseWinesFromModel(message.content) : []
  return { candidates: rawToolWines.length ? rawToolWines : contentWines, parsedArgs, message }
}

async function callVisionModel(apiKey: string, dataUrl: string, prompt: string, signal: AbortSignal, useTools = true) {
  const body: Record<string, unknown> = {
    model: 'gemini-2.5-flash',
    stream: false,
    temperature: 0.1,
    max_tokens: 8192,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }],
  }
  if (useTools) {
    body.tools = [
      {
        type: 'function',
        function: {
          name: 'extract_wines',
          description: 'Return only specific wines visible in the image, or an empty result with retake guidance.',
          parameters: wineExtractionParameters,
        },
      },
    ]
    body.tool_choice = { type: 'function', function: { name: 'extract_wines' } }
  }
  return fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const wineExtractionParameters = {
  type: 'object',
  properties: {
    wines: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' }, name: { type: 'string' }, vintage: { type: 'string' }, region: { type: 'string' }, grape: { type: 'string' }, price: { type: 'string' }, priceNum: { type: 'number' }, rating: { type: 'number' }, ratingLabel: { type: 'string' }, body: { type: 'number' }, sweetness: { type: 'number' }, tannin: { type: 'number' }, acidity: { type: 'number' }, isValue: { type: 'boolean' }, isCrowd: { type: 'boolean' }, tasting: { type: 'string' }, confidence: { type: 'number' }, color: { type: 'string', enum: ['red', 'white', 'rose', 'sparkling', 'dessert', ''] }, maker: { type: 'string' }, certifications: { type: 'array', items: { type: 'string', enum: ['natural', 'biodynamic', 'organic', 'low_sulfite'] } }, bbox: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } }, required: ['x', 'y', 'w', 'h'], additionalProperties: false },
        },
        required: ['id', 'name', 'vintage', 'region', 'grape', 'price', 'priceNum', 'rating', 'ratingLabel', 'body', 'sweetness', 'tannin', 'acidity', 'isValue', 'isCrowd', 'tasting', 'confidence', 'color', 'maker', 'certifications', 'bbox'],
        additionalProperties: false,
      },
    },
    message: { type: 'string' }, readability: { type: 'string', enum: ['good', 'partial', 'unreadable'] }, retakeReasons: { type: 'array', items: { type: 'string', enum: ['too_blurry', 'too_dark', 'too_far', 'glare', 'angle_skewed', 'label_cut_off', 'not_a_wine_image', 'list_too_dense'] } },
  },
  required: ['wines', 'message', 'readability', 'retakeReasons'],
  additionalProperties: false,
}

export const Route = createFileRoute('/api/scan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authResult = await requireAuth(request)
        if (authResult instanceof Response) return authResult

        const apiKey = process.env.GOOGLE_AI_API_KEY
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

        // Only shelf mode gets an extra prompt suffix — list and bottle work fine with the base prompt.
        const SHELF_SUFFIX = `\n\nMODE: STORE SHELF — The user deliberately pointed their camera at a wine shelf. Apply maximum leniency beyond the default rules:
- Return EVERY bottle where you can read ANY text, even a partial producer name or varietal.
- Include bottles you recognize by label design, bottle shape, or color even if text is not fully legible — use confidence 10-25 and set tasting to "label partially visible".
- A partial read at confidence 15 is far better than nothing. Do NOT return an empty wines array if any bottles are visible.
- If a shelf tag or price tag is near a bottle, use it to identify the wine even if the label is blurry.`
        const prompt = payload.mode === 'shelf' ? PROMPT + SHELF_SUFFIX : PROMPT

        const abort = new AbortController()
        const timeout = setTimeout(() => abort.abort(), 55_000)
        try {
          const upstream = await callVisionModel(apiKey, dataUrl, prompt, abort.signal, true)

          const raw = await upstream.text().catch(() => '')
          if (!upstream.ok) {
            console.error('AI gateway scan error', upstream.status, raw)
            const userError = upstream.status === 429 || upstream.status === 503
              ? 'AI is busy right now — please try again in a moment.'
              : upstream.status === 402
                ? 'AI quota exceeded — check your Google AI API account.'
                : 'Vision analysis failed'
            return new Response(JSON.stringify({ error: userError }), {
              status: upstream.status === 429 || upstream.status === 503 || upstream.status === 402 ? upstream.status : 502,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          const { candidates: firstCandidates, parsedArgs, message } = extractCandidatesFromCompletion(raw)
          console.log('[scan] first pass: raw length', raw.length, '| candidates', firstCandidates.length, '| readability', parsedArgs?.readability)
          console.log('[scan] first pass names+conf:', JSON.stringify(firstCandidates.slice(0, 5).map((w: any) => ({ n: w?.name, c: w?.confidence }))))
          if (!firstCandidates.length) {
            console.log('[scan] first pass tool_calls raw:', JSON.stringify(safeJsonParse(raw)?.choices?.[0]?.message).slice(0, 400))
          }
          let allCandidates = firstCandidates as Array<ReturnType<typeof normalizeWine> & {}>
          if (!allCandidates.length) {
            const rescue = await callVisionModel(apiKey, dataUrl, RESCUE_PROMPT, abort.signal, false)
            const rescueRaw = await rescue.text().catch(() => '')
            if (rescue.ok) {
              allCandidates = extractCandidatesFromCompletion(rescueRaw).candidates as Array<ReturnType<typeof normalizeWine> & {}>
              console.log('[scan] rescue pass: candidates', allCandidates.length)
            } else {
              console.warn('AI gateway rescue scan error', rescue.status, rescueRaw)
            }
          }
          const seenCount = allCandidates.length
          // Drop low-confidence wines (post-OCR recognition gate)
          const rawWines = allCandidates.filter((w) => (w?.confidence ?? 0) >= MIN_WINE_CONFIDENCE)
          console.log('[scan] after confidence filter:', rawWines.length, '/', seenCount, 'mode:', payload.mode)

          // Enrich each wine with quality_score + corrected palate axes from the catalog.
          // Runs in parallel; falls back gracefully when no catalog match is found.
          const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
          const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? ''
          const wines = (SUPABASE_URL && SUPABASE_KEY)
            ? await enrichWinesFromCatalog(rawWines, SUPABASE_URL, SUPABASE_KEY)
            : rawWines.map((w) => ({ ...w, qualityScore: 50, catalogConfidence: 'unknown' as const }))

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
