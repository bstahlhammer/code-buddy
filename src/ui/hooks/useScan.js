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
        throw new Error(msg || 'Scan failed')
      }

      onProgress?.({ stage: 'reading', message: 'Uncorking the image…' })
      const wines = []

      const tryEmit = (raw) => {
        // Strip code fences / language tags / stray commas the model sometimes adds
        let s = raw.trim()
        if (!s) return
        if (s.startsWith('```')) s = s.replace(/^```(?:json)?/i, '').trim()
        if (s.endsWith('```')) s = s.slice(0, -3).trim()
        s = s.replace(/^,+/, '').replace(/,+$/, '').trim()
        if (!s.startsWith('{')) return
        try {
          const item = JSON.parse(s)
          if (item?.type === 'progress') {
            onProgress?.(item)
            return
          }
          if (item?.type === 'error') {
            throw new Error(item.message || 'Scan failed')
          }
          const wine = item
          if (wine && typeof wine === 'object' && wine.name) {
            wines.push(wine)
            onWine?.(wine, wines.length)
            onProgress?.({ stage: 'wine', count: wines.length, message: `${wines.length} wine${wines.length === 1 ? '' : 's'} identified` })
          }
        } catch (e) {
          if (!(e instanceof SyntaxError)) throw e
          // skip — partial or malformed
        }
      }

      const parseObjectsFromText = (text) => {
        // Extract every complete top-level {...} object from the response,
        // regardless of newlines, buffering, or code fences around them.
        let buf = text || ''
        let i = 0
        while (i < buf.length) {
          const start = buf.indexOf('{', i)
          if (start === -1) break
          // find matching closing brace, accounting for strings
          let depth = 0
          let inStr = false
          let esc = false
          let end = -1
          for (let j = start; j < buf.length; j++) {
            const c = buf[j]
            if (inStr) {
              if (esc) esc = false
              else if (c === '\\') esc = true
              else if (c === '"') inStr = false
            } else {
              if (c === '"') inStr = true
              else if (c === '{') depth++
              else if (c === '}') {
                depth--
                if (depth === 0) { end = j; break }
              }
            }
          }
          if (end === -1) {
            break
          }
          tryEmit(buf.slice(start, end + 1))
          i = end + 1
        }
      }

      // Read the complete response instead of depending on streaming support;
      // this is much more reliable on mobile browsers and still preserves all results.
      parseObjectsFromText(await res.text())

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

function resizeAndEncode(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 960
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) {
          height = Math.round((height * MAX) / width)
          width = MAX
        } else {
          width = Math.round((width * MAX) / height)
          height = MAX
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}
