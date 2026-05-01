import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * useWineRatings — persist per-wine bucket ratings to the `wine_ratings`
 * table. The table has a (user_id, wine_id) unique constraint via the
 * upsert key we apply here.
 */
export function useWineRatings() {
  const saveRating = useCallback(async ({ wineId, bucketId } = {}) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId || !wineId || !bucketId) return { error: 'Missing fields' }

      // Upsert by (user_id, wine_id)
      const { data: existing } = await supabase
        .from('wine_ratings')
        .select('id')
        .eq('user_id', userId)
        .eq('wine_id', String(wineId))
        .maybeSingle()

      if (existing) {
        const { error } = await supabase
          .from('wine_ratings')
          .update({ bucket_id: bucketId })
          .eq('id', existing.id)
        return { error: error?.message }
      }
      const { error } = await supabase.from('wine_ratings').insert({
        user_id: userId,
        wine_id: String(wineId),
        bucket_id: bucketId,
      })
      return { error: error?.message }
    } catch (e) {
      return { error: e.message || 'Could not save rating' }
    }
  }, [])

  const listRatings = useCallback(async () => {
    const { data, error } = await supabase
      .from('wine_ratings')
      .select('wine_id, bucket_id')
      .limit(500)
    if (error) return { error: error.message, ratings: {} }
    const map = {}
    for (const r of data || []) map[r.wine_id] = r.bucket_id
    return { ratings: map }
  }, [])

  return { saveRating, listRatings }
}
