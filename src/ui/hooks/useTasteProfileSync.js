import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * useTasteProfileSync — persist the derived taste profile to Supabase
 * so that profile management (fine-tune sliders, retake quiz) survives
 * across sessions.
 */
export function useTasteProfileSync() {
  const saveProfile = useCallback(async (tasteProfile, { refined = false } = {}) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId || !tasteProfile) return { error: 'Not signed in' }

      const payload = {
        user_id: userId,
        palate: tasteProfile.palate || null,
        archetype: {
          id: tasteProfile.id,
          name: tasteProfile.name,
          description: tasteProfile.description,
          loves: tasteProfile.loves,
          skips: tasteProfile.skips,
        },
        flavor_character: tasteProfile.flavorCharacter || null,
        ai_palate: tasteProfile.aiPalate || null,
        has_ai_signal: !!tasteProfile.hasAiSignal,
        inference_confidence: tasteProfile.inferenceConfidence ?? null,
        ...(refined ? { last_refined_at: new Date().toISOString() } : {}),
      }

      const { data: existing } = await supabase
        .from('taste_profiles').select('id').eq('user_id', userId).maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('taste_profiles').update(payload).eq('user_id', userId)
        return { error: error?.message }
      }
      const { error } = await supabase.from('taste_profiles').insert(payload)
      return { error: error?.message }
    } catch (e) {
      return { error: e.message }
    }
  }, [])

  const loadProfile = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const userId = sessionData?.session?.user?.id
    if (!userId) return { profile: null }
    const { data } = await supabase
      .from('taste_profiles').select('*').eq('user_id', userId).maybeSingle()
    if (!data) return { profile: null }
    const profile = {
      ...(data.archetype || {}),
      palate: data.palate,
      flavorCharacter: data.flavor_character,
      aiPalate: data.ai_palate,
      hasAiSignal: !!data.has_ai_signal,
      inferenceConfidence: data.inference_confidence,
      lastRefinedAt: data.last_refined_at,
    }
    return { profile }
  }, [])

  return { saveProfile, loadProfile }
}
