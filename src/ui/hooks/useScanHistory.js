import { useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * useScanHistory — persistence helpers for past scans.
 *
 * Responsibilities:
 *   - upload the original shelf photo to the `scan-photos` storage bucket
 *   - insert a row in `scans` plus one row per wine in `scan_wines`
 *   - list / load / delete past scans for the signed-in user
 *
 * Failures are swallowed and surfaced via the returned values — callers
 * shouldn't block their flow on history persistence.
 */
export function useScanHistory() {
  const saveScan = useCallback(async ({ wines, photoFile, buyingFor, locationLabel }) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData?.session?.user?.id
      if (!userId) return { error: 'Not signed in' }

      // 1. Upload photo (best-effort)
      let photoPath = null
      if (photoFile) {
        const ext = (photoFile.name?.split('.').pop() || 'jpg').toLowerCase()
        const path = `${userId}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('scan-photos')
          .upload(path, photoFile, { upsert: false, contentType: photoFile.type || 'image/jpeg' })
        if (!upErr) photoPath = path
      }

      // 2. Insert scan
      const { data: scan, error: scanErr } = await supabase
        .from('scans')
        .insert({
          user_id: userId,
          photo_path: photoPath,
          location_label: locationLabel || null,
          buying_for: buyingFor || null,
          wine_count: wines?.length ?? 0,
        })
        .select()
        .single()
      if (scanErr) return { error: scanErr.message }

      // 3. Insert wines
      if (wines?.length) {
        const rows = wines.map((wine, i) => ({
          scan_id: scan.id,
          user_id: userId,
          wine_payload: wine,
          position: i,
        }))
        await supabase.from('scan_wines').insert(rows)
      }

      return { scan }
    } catch (e) {
      return { error: e.message || 'Could not save scan' }
    }
  }, [])

  const listScans = useCallback(async () => {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) return { error: error.message, scans: [] }
    return { scans: data || [] }
  }, [])

  const loadScan = useCallback(async (scanId) => {
    const { data: scan, error: e1 } = await supabase
      .from('scans').select('*').eq('id', scanId).maybeSingle()
    if (e1 || !scan) return { error: e1?.message || 'Scan not found' }
    const { data: rows } = await supabase
      .from('scan_wines').select('*').eq('scan_id', scanId).order('position')
    const wines = (rows || []).map(r => r.wine_payload)
    return { scan, wines }
  }, [])

  const deleteScan = useCallback(async (scan) => {
    if (scan?.photo_path) {
      await supabase.storage.from('scan-photos').remove([scan.photo_path])
    }
    const { error } = await supabase.from('scans').delete().eq('id', scan.id)
    return { error: error?.message }
  }, [])

  const updateScanLocation = useCallback(async (scanId, locationLabel) => {
    const { error } = await supabase
      .from('scans').update({ location_label: locationLabel || null }).eq('id', scanId)
    return { error: error?.message }
  }, [])

  const getPhotoUrl = useCallback(async (path) => {
    if (!path) return null
    const { data } = await supabase.storage
      .from('scan-photos').createSignedUrl(path, 60 * 60)
    return data?.signedUrl || null
  }, [])

  return { saveScan, listScans, loadScan, deleteScan, updateScanLocation, getPhotoUrl }
}
