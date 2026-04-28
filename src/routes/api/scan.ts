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

Extract up to the first 12 wines that are CLEARLY AND UNAMBIGUOUSLY VISIBLE in the image. Emit one JSON object per line (NDJSON) as soon as you identify each wine.

ANTI-HALLUCINATION RULES — these are the most important rules:
- ONLY include a wine if you can actually read its name on the label or list. If you are not sure, OMIT it.
- NEVER invent, guess, or "fill in" wines from your training data. If the image shows 3 wines, return 3 — not 12.
- If text is blurry, cut off, or partially obscured, OMIT that wine rather than guessing.
- Better to return fewer accurate wines than more invented ones. Returning 0 wines is a valid response if nothing is clearly readable.
- For each wine, include a "confidence" score (0-100) reflecting how clearly you could read its name and details. Use <60 only when you are still confident the wine is real.

OUTPUT RULES:
- Output RAW JSON only. NO markdown. NO code fences. NO triple backticks. NO "json" labels.
- Exactly one compact JSON object per line, separated by a single newline.
- Start emitting the first wine immediately; do NOT batch them all at the end.
- No preamble, no commentary, no trailing summary.
- Stop after 12 wines.

Field rules — ONLY use what you can SEE on the label/list. For everything else, use the conservative defaults below:
- id: integer starting at 1
- name: string — must match what's printed (producer + cuvée). REQUIRED, must be readable.
- vintage: string — the year printed on the label, or "NV" if "NV"/"non-vintage" is shown, or "" (empty string) if not visible. DO NOT guess.
- region: string — only if printed or unmistakable from the label; otherwise "".
- grape: string — only if printed; otherwise "".
- price: string — only if a price is shown next to the wine (e.g. "$45"); otherwise "—".
- priceNum: number — numeric price if shown; otherwise 0.
- rating: number — 0 (unknown). DO NOT estimate quality scores.
- ratingLabel: string — "" (empty). DO NOT estimate.
- body, sweetness, tannin, acidity: number — 50 each (neutral default). DO NOT estimate from training knowledge.
- isValue: false
- isCrowd: false
- tasting: "" (empty string). DO NOT generate tasting notes.
- confidence: number 0-100 — how clearly you could read this wine on the image.`

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
                  model: 'google/gemini-2.5-flash-lite',
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
