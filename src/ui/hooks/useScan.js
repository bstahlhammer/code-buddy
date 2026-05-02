import { useCallback, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

export function useScan() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)

  const scanImage = useCallback(async function scanImage(file, onWine, onProgress) {
    setScanning(true)
    setError(null)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 70_000)
    try {
      onProgress?.({ stage: 'preparing', message: 'Cutting the foil…' })
      const base64 = await fileToDownscaledBase64(file).catch(async (err) => {
        console.warn('downscale failed, falling back to raw upload', err)
        return fileToBase64(file)
      })
      onProgress?.({ stage: 'uploading', message: 'Presenting the bottle…' })
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        throw new Error('Please sign in to scan a wine list.')
      }
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageBase64: base64 }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const msg = await res.text().catch(() => 'Scan failed')
        const parsed = safeJsonParse(msg)
        if (parsed?.error) throw new Error(parsed.error)
        throw new Error(msg || 'Scan failed')
      }

      onProgress?.({ stage: 'reading', message: 'Uncorking the image…' })
      const data = await res.json().catch(() => null)
      if (data?.error) throw new Error(data.error)
      const wines = Array.isArray(data?.wines) ? data.wines.filter((wine) => wine?.name) : []
      const readability = data?.readability || (wines.length ? 'good' : 'unreadable')
      const retakeReasons = Array.isArray(data?.retakeReasons) ? data.retakeReasons : []
      const message = typeof data?.message === 'string' ? data.message : ''
      if (!wines.length) {
        const err = new Error(message || 'I could not identify a specific wine. Try a closer, sharper photo where the full label or shelf tag is readable.')
        err.readability = readability
        err.retakeReasons = retakeReasons
        throw err
      }
      wines.forEach((wine, index) => {
        onWine?.(wine, index + 1)
        onProgress?.({ stage: 'wine', count: index + 1, message: `${index + 1} wine${index + 1 === 1 ? '' : 's'} identified` })
      })

      return { wines, readability, retakeReasons, message }
    } catch (e) {
      setError(e.message || 'Scan failed')
      throw e
    } finally {
      clearTimeout(timeout)
      setScanning(false)
    }
  }, [])

  return { scanning, error, scanImage }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const timeout = setTimeout(() => {
      reader.abort()
      reject(new Error('file_read_timeout'))
    }, 8000)
    reader.onload = () => {
      clearTimeout(timeout)
      const result = reader.result || ''
      const comma = String(result).indexOf(',')
      resolve(comma >= 0 ? String(result).slice(comma + 1) : '')
    }
    reader.onerror = () => { clearTimeout(timeout); reject(reader.error || new Error('Could not read file')) }
    reader.onabort = () => { clearTimeout(timeout); reject(new Error('file_read_aborted')) }
    reader.readAsDataURL(file)
  })
}
