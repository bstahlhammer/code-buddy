/**
 * Lazy bbox backfill: given a scan_id and a wine name, locate that bottle
 * in the scan's saved photo and persist the bbox back into scan_wines.wine_payload.
 *
 * Used when a user opens an old scan (taken before bbox was captured) and
 * taps "Find on shelf". One AI call per old wine, cached forever after.
 */
import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const InputSchema = z.object({
  scanId: z.string().uuid(),
  wineName: z.string().trim().min(1).max(200),
})

const PROMPT = `You are looking at a wine shelf or wine list photo. The user is trying to find ONE specific bottle/listing on this image.

Return the bounding box of the wine named below, expressed as normalized values (0..1) of the image dimensions:
{ "x": <left edge 0..1>, "y": <top edge 0..1>, "w": <width 0..1>, "h": <height 0..1> }

Be as tight as you can around the bottle or list line. If you cannot confidently locate it, return { "x": 0, "y": 0, "w": 0, "h": 0 } and set "found": false.`

function clampUnit(n: unknown): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function normalizeBbox(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>
  const x = clampUnit(b.x), y = clampUnit(b.y)
  const w = clampUnit(b.w), h = clampUnit(b.h)
  if (w <= 0 || h <= 0) return null
  const cw = Math.max(0, Math.min(1 - x, w))
  const ch = Math.max(0, Math.min(1 - y, h))
  if (cw <= 0 || ch <= 0) return null
  return { x, y, w: cw, h: ch }
}

export const Route = createFileRoute('/api/scan/locate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY
        const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
        const apiKey = process.env.LOVABLE_API_KEY
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !SERVICE_ROLE || !apiKey) {
          return json({ error: 'Server not configured' }, 500)
        }

        // Auth check
        const authHeader = request.headers.get('authorization') ?? ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
        if (!token) return json({ error: 'Sign in required' }, 401)

        const userClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        })
        const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token)
        const userId = claims?.claims?.sub
        if (claimsErr || !userId) return json({ error: 'Invalid session' }, 401)

        let body: z.infer<typeof InputSchema>
        try {
          body = InputSchema.parse(await request.json())
        } catch {
          return json({ error: 'Invalid input' }, 400)
        }

        const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        })

        // 1. Load scan + verify ownership
        const { data: scan, error: scanErr } = await admin
          .from('scans')
          .select('id, user_id, photo_path')
          .eq('id', body.scanId)
          .maybeSingle()
        if (scanErr || !scan) return json({ error: 'Scan not found' }, 404)
        if (scan.user_id !== userId) return json({ error: 'Forbidden' }, 403)
        if (!scan.photo_path) return json({ error: 'No photo on this scan' }, 400)

        // 2. Download photo from private bucket
        const { data: file, error: dlErr } = await admin.storage
          .from('scan-photos')
          .download(scan.photo_path)
        if (dlErr || !file) return json({ error: 'Could not load photo' }, 500)

        // Convert blob to base64 data URL
        const buf = Buffer.from(await file.arrayBuffer())
        const mime = file.type || 'image/jpeg'
        const dataUrl = `data:${mime};base64,${buf.toString('base64')}`

        // 3. Ask AI to locate the bottle
        const abort = new AbortController()
        const timeout = setTimeout(() => abort.abort(), 30_000)
        try {
          const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            signal: abort.signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash',
              temperature: 0,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: `${PROMPT}\n\nWine to locate: "${body.wineName}"` },
                    { type: 'image_url', image_url: { url: dataUrl } },
                  ],
                },
              ],
              tools: [
                {
                  type: 'function',
                  function: {
                    name: 'locate_bottle',
                    description: 'Return the bbox of the requested wine.',
                    parameters: {
                      type: 'object',
                      properties: {
                        found: { type: 'boolean' },
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
                      required: ['found', 'bbox'],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: 'function', function: { name: 'locate_bottle' } },
            }),
          })

          if (!res.ok) {
            const text = await res.text().catch(() => '')
            console.error('locate AI error', res.status, text)
            return json({ error: 'Could not locate bottle' }, 502)
          }
          const json1 = await res.json()
          const argsRaw = json1.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
          const parsed = typeof argsRaw === 'string' ? safeJson(argsRaw) : null
          if (!parsed?.found) {
            return json({ found: false, bbox: null }, 200)
          }
          const bbox = normalizeBbox(parsed.bbox)
          if (!bbox) return json({ found: false, bbox: null }, 200)

          // 4. Persist bbox into the matching scan_wines row(s)
          const { data: rows } = await admin
            .from('scan_wines')
            .select('id, wine_payload')
            .eq('scan_id', body.scanId)
          if (rows) {
            const target = rows.find(r => {
              const n = (r.wine_payload as { name?: string })?.name
              return typeof n === 'string' && n.trim().toLowerCase() === body.wineName.trim().toLowerCase()
            })
            if (target) {
              const next = { ...(target.wine_payload as object), bbox }
              await admin.from('scan_wines').update({ wine_payload: next }).eq('id', target.id)
            }
          }

          return json({ found: true, bbox }, 200)
        } catch (err) {
          console.error('locate request error', err)
          return json({ error: 'Locate request failed' }, 504)
        } finally {
          clearTimeout(timeout)
        }
      },
    },
  },
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function safeJson(value: string) {
  try { return JSON.parse(value) } catch { return null }
}
