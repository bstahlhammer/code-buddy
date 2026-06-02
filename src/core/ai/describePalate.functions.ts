import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const InputSchema = z.object({
  description: z.string().trim().min(3).max(2000),
})

const PalateSchema = z.object({
  body: z.number().min(0).max(100),
  tannin: z.number().min(0).max(100),
  sweetness: z.number().min(0).max(100),
  acidity: z.number().min(0).max(100),
})

export type DescribePalateResult = {
  palate: z.infer<typeof PalateSchema>
  confidence: number // 0..1
  coachingNote: string
  vocabulary: string[]
  error?: string
}

const SYSTEM = `You are a sommelier helping a beginner translate their casual wine descriptions into a structured taste profile.

The user will describe wines they love (or hate) using everyday language ("smooth reds", "I hated that dry one", "I love sweet bubbly"). Your job is to:

1. Infer the four core palate axes on a 0-100 scale:
   - body: 0 = light/watery, 100 = full/heavy/rich
   - tannin: 0 = silky/no grip, 100 = very grippy/drying (mostly reds)
   - sweetness: 0 = bone dry, 100 = dessert-sweet
   - acidity: 0 = soft/flabby, 100 = bright/zippy/crisp
2. Estimate confidence (0..1) based on how specific the description is.
3. Write a warm, ONE-sentence coaching note that mirrors what they said back in proper wine vocabulary, teaching them a term or two. Avoid jargon dumps. Be encouraging.
4. Pick 2-4 short vocabulary tags (single words or short phrases) the user just learned, e.g. ["full-bodied", "low tannin", "off-dry"].

Always call the extract_palate tool. Never reply in plain text.`

export const describePalate = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<DescribePalateResult> => {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      return {
        palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
        confidence: 0,
        coachingNote: 'AI is not configured yet — try rating a bottle instead.',
        vocabulary: [],
        error: 'missing_api_key',
      }
    }

    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: data.description },
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'extract_palate',
                description: 'Return structured palate inference from the user description.',
                parameters: {
                  type: 'object',
                  properties: {
                    body: { type: 'number', description: '0..100, light to full' },
                    tannin: { type: 'number', description: '0..100, silky to grippy' },
                    sweetness: { type: 'number', description: '0..100, dry to sweet' },
                    acidity: { type: 'number', description: '0..100, soft to bright' },
                    confidence: { type: 'number', description: '0..1' },
                    coachingNote: {
                      type: 'string',
                      description: 'One warm sentence echoing their words in wine vocabulary.',
                    },
                    vocabulary: {
                      type: 'array',
                      items: { type: 'string' },
                      description: '2-4 short wine terms the user just learned.',
                    },
                  },
                  required: ['body', 'tannin', 'sweetness', 'acidity', 'confidence', 'coachingNote', 'vocabulary'],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: 'function', function: { name: 'extract_palate' } },
        }),
      })

      if (!res.ok) {
        if (res.status === 429) {
          return {
            palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
            confidence: 0,
            coachingNote: 'AI is busy right now — please try again in a moment.',
            vocabulary: [],
            error: 'rate_limited',
          }
        }
        if (res.status === 402) {
          return {
            palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
            confidence: 0,
            coachingNote: 'AI quota exceeded — check your Google AI API account.',
            vocabulary: [],
            error: 'payment_required',
          }
        }
        const text = await res.text()
        console.error('AI gateway error', res.status, text)
        return {
          palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
          confidence: 0,
          coachingNote: 'AI couldn\'t parse that — try rephrasing or rate a bottle instead.',
          vocabulary: [],
          error: 'gateway_error',
        }
      }

      const json = await res.json()
      const toolCall = json.choices?.[0]?.message?.tool_calls?.[0]
      const argsRaw = toolCall?.function?.arguments
      if (!argsRaw) throw new Error('no tool call in response')
      const parsed = JSON.parse(argsRaw)

      const palate = PalateSchema.parse({
        body: clamp(parsed.body),
        tannin: clamp(parsed.tannin),
        sweetness: clamp(parsed.sweetness),
        acidity: clamp(parsed.acidity),
      })

      return {
        palate,
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
        coachingNote: String(parsed.coachingNote || '').slice(0, 280),
        vocabulary: Array.isArray(parsed.vocabulary)
          ? parsed.vocabulary.slice(0, 6).map((v: unknown) => String(v).slice(0, 40))
          : [],
      }
    } catch (e) {
      console.error('describePalate failed', e)
      return {
        palate: { body: 50, tannin: 40, sweetness: 30, acidity: 55 },
        confidence: 0,
        coachingNote: 'Something went wrong. Try a shorter description or rate a bottle.',
        vocabulary: [],
        error: 'unknown',
      }
    }
  })

function clamp(n: unknown): number {
  const v = Number(n)
  if (!Number.isFinite(v)) return 50
  return Math.max(0, Math.min(100, Math.round(v)))
}
