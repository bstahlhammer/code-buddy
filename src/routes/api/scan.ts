import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const InputSchema = z.object({
  imageBase64: z.string().min(100).max(10_000_000),
  mode: z.enum(['list', 'shelf', 'bottle']).optional(),
  buyingFor: z.enum(['me', 'group', 'gift']).optional(),
})

const PROMPT = `You are a wine expert analyzing an image of a wine list, wine shelf, or single bottle.

Extract every wine visible. Emit one JSON object per line (NDJSON) as soon as you identify each wine.

CRITICAL OUTPUT RULES — read carefully:
- Output RAW JSON only. NO markdown. NO code fences. NO triple backticks. NO "json" labels.
- Exactly one compact JSON object per line, separated by a single newline.
- Start emitting the first wine immediately; do NOT batch them all at the end.
- No preamble, no commentary, no trailing summary.

Required fields per wine:
- id: integer starting at 1
- name: string
- vintage: string (estimate if not shown, e.g. "NV" or "2020")
- region: string
- grape: string
- price: string (e.g. "$45" or "—" if unknown)
- priceNum: number (numeric price, 0 if unknown)
- rating: number (0-100 estimated quality score)
- ratingLabel: string ("Outstanding" 90+, "Excellent" 85-89, "Very Good" 80-84, "Good" <80)
- body: number (0-100, light to full)
- sweetness: number (0-100, dry to sweet)
- tannin: number (0-100)
- acidity: number (0-100)
- isValue: boolean
- isCrowd: boolean (crowd-pleaser)
- tasting: string (one short sentence)`

export const Route = createFileRoute('/api/scan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        const upstream = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
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
          return new Response(JSON.stringify({ error: 'Vision analysis failed' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // Transform OpenAI-style SSE stream → raw text → NDJSON line stream
        const stream = new ReadableStream({
          async start(controller) {
            const reader = upstream.body!.getReader()
            const decoder = new TextDecoder()
            const encoder = new TextEncoder()
            let sseBuf = ''
            let lineBuf = ''

            try {
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
                        if (out) controller.enqueue(encoder.encode(out + '\n'))
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
            } catch (err) {
              console.error('scan stream error', err)
            } finally {
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
