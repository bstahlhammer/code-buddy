import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * useScanFeedback — log "this wine wasn't on the list" reports so the
 * extractor can be improved. Stored in `scan_feedback` (RLS: own rows).
 */
export function useScanFeedback() {
  const reportFeedback = useCallback(async ({ scanId, wineName, wineId, reason = 'not_on_list', note } = {}) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) return { error: 'Not signed in' }

      const { error } = await supabase.from('scan_feedback').insert({
        user_id: userId,
        scan_id: scanId || null,
        wine_name: wineName || null,
        wine_id: wineId ? String(wineId) : null,
        reason,
        note: note || null,
      })
      return { error: error?.message }
    } catch (e) {
      return { error: e.message || 'Could not save feedback' }
    }
  }, [])

  return { reportFeedback }
}
