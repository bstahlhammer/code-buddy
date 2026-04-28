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

Extract every wine you can read in the image, up to 12. Emit one JSON object per line (NDJSON) as soon as you identify each wine.

GROUNDING RULES — important:
- The "name" field MUST be a wine you can actually see in the image. Do not invent wines that aren't there.
- If only part of a name is visible, return what you can read (e.g. "Château Margaux" without vintage is fine).
- It is OK to be generous about including wines — partial reads are welcome — but the name must come from the image, not from memory.
- For each wine, include a "confidence" score (0-100) reflecting how clearly you could read the name on the image. Lower it for blurry/partial labels, but still include the wine.

OUTPUT RULES:
- Output RAW JSON only. NO markdown. NO code fences. NO triple backticks. NO "json" labels.
- Exactly one compact JSON object per line, separated by a single newline.
- Start emitting the first wine immediately; do NOT batch them all at the end.
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

        // Return a stream immediately, then do vision work inside it so the UI
        // can show real progress instead of waiting on the upstream model.
        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            const decoder = new TextDecoder()
            const emit = (event: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
            let sseBuf = ''
            let lineBuf = ''
            let wineCount = 0
            const abort = new AbortController()
            const timeout = setTimeout(() => abort.abort(), 55_000)

            try {
              emit({ type: 'progress', stage: 'received', message: 'Photo received — cutting the foil…' })
              const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
                method: 'POST',
                signal: abort.signal,
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  model: 'google/gemini-2.5-flash',
                  stream: true,
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

              if (!upstream.ok || !upstream.body) {
                const text = await upstream.text().catch(() => '')
                console.error('AI gateway scan error', upstream.status, text)
                emit({ type: 'error', message: 'Vision analysis failed' })
                return
              }

              emit({ type: 'progress', stage: 'reading', message: 'Uncorking the image…' })
              const reader = upstream.body.getReader()
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                sseBuf += decoder.decode(value, { stream: true })
                const events = sseBuf.split('\n')
                sseBuf = events.pop() ?? ''
                for (const ev of events) {
                  const line = ev.trim()
                  if (!line.startsWith('data:')) continue
                  const data = line.slice(5).trim()
                  if (data === '[DONE]') continue
                  try {
                    const j = JSON.parse(data)
                    const delta = j.choices?.[0]?.delta?.content
                    if (typeof delta === 'string' && delta.length) {
                      lineBuf += delta
                      // flush complete lines as soon as we have them
                      let nl
                      while ((nl = lineBuf.indexOf('\n')) !== -1) {
                        const out = lineBuf.slice(0, nl).trim()
                        lineBuf = lineBuf.slice(nl + 1)
                        if (out) {
                          controller.enqueue(encoder.encode(out + '\n'))
                          try {
                            const parsed = JSON.parse(out)
                            if (parsed?.name) wineCount += 1
                          } catch {}
                          if (wineCount >= 12) {
                            await reader.cancel().catch(() => {})
                            emit({ type: 'done', count: wineCount, message: 'Shortlist poured.' })
                            return
                          }
                        }
                      }
                    }
                  } catch {
                    // ignore malformed SSE chunk
                  }
                }
              }
              // flush trailing line
              const tail = lineBuf.trim()
              if (tail) controller.enqueue(encoder.encode(tail + '\n'))
              emit({ type: 'done', count: wineCount, message: 'Shortlist poured.' })
            } catch (err) {
              console.error('scan stream error', err)
              emit({ type: 'error', message: 'The scan took too long' })
            } finally {
              clearTimeout(timeout)
              controller.close()
            }
          },
        })

        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
          },
        })
      },
    },
  },
})
