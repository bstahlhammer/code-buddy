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
      const base64 = await resizeAndEncode(file)
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
      if (!wines.length) {
        throw new Error(data?.message || 'I could not identify a specific wine. Try a closer, sharper photo where the full label or shelf tag is readable.')
      }
      wines.forEach((wine, index) => {
        onWine?.(wine, index + 1)
        onProgress?.({ stage: 'wine', count: index + 1, message: `${index + 1} wine${index + 1 === 1 ? '' : 's'} identified` })
      })

      return wines
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

function resizeViaImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    let settled = false
    const done = (fn, arg) => { if (settled) return; settled = true; URL.revokeObjectURL(url); fn(arg) }
    // Hard timeout — some HEIC/odd files never fire onload or onerror
    const t = setTimeout(() => done(reject, new Error('image_decode_timeout')), 8000)
    img.onload = () => {
      clearTimeout(t)
      try {
        const MAX = 960
        let { width, height } = img
        if (!width || !height) return done(reject, new Error('image_no_dimensions'))
        if (width > MAX || height > MAX) {
          if (width >= height) { height = Math.round((height * MAX) / width); width = MAX }
          else { width = Math.round((width * MAX) / height); height = MAX }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
        done(resolve, dataUrl.split(',')[1])
      } catch (err) {
        done(reject, err)
      }
    }
    img.onerror = () => { clearTimeout(t); done(reject, new Error('image_decode_failed')) }
    img.src = url
  })
}

async function resizeAndEncode(file) {
  // Try createImageBitmap first (fastest, works on most mobile browsers, handles EXIF)
  try {
    if (typeof createImageBitmap === 'function') {
      const bitmap = await Promise.race([
        createImageBitmap(file),
        new Promise((_, rej) => setTimeout(() => rej(new Error('bitmap_timeout')), 8000)),
      ])
      const MAX = 960
      let { width, height } = bitmap
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round((height * MAX) / width); width = MAX }
        else { width = Math.round((width * MAX) / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
      bitmap.close?.()
      return canvas.toDataURL('image/jpeg', 0.72).split(',')[1]
    }
  } catch (_) {
    // fall through
  }
  // Fallback: <img> + canvas
  try {
    return await resizeViaImage(file)
  } catch (_) {
    // Last resort: send the original bytes (may be larger / HEIC, but at least we try)
    return await fileToBase64(file)
  }
}
