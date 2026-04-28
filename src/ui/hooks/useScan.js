import { useState } from 'react'

export function useScan() {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)

  async function scanImage(file, onWine) {
    setScanning(true)
    setError(null)
    try {
      const base64 = await resizeAndEncode(file)
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })

      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => 'Scan failed')
        throw new Error(msg || 'Scan failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      const wines = []
      let buf = ''

      const tryEmit = (raw) => {
        // Strip code fences / language tags / stray commas the model sometimes adds
        let s = raw.trim()
        if (!s) return
        if (s.startsWith('```')) s = s.replace(/^```(?:json)?/i, '').trim()
        if (s.endsWith('```')) s = s.slice(0, -3).trim()
        s = s.replace(/^,+/, '').replace(/,+$/, '').trim()
        if (!s.startsWith('{')) return
        try {
          const wine = JSON.parse(s)
          if (wine && typeof wine === 'object' && wine.name) {
            wines.push(wine)
            onWine?.(wine, wines.length)
          }
        } catch {
          // skip — partial or malformed
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // Extract every complete top-level {...} object from the buffer,
        // regardless of newlines or code fences around them.
        let i = 0
        while (i < buf.length) {
          const start = buf.indexOf('{', i)
          if (start === -1) { buf = ''; break }
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
            // incomplete object — keep from `start` for next chunk
            buf = buf.slice(start)
            break
          }
          tryEmit(buf.slice(start, end + 1))
          i = end + 1
        }
      }

      // flush any final object hiding in the tail
      tryEmit(buf)

      return wines
    } catch (e) {
      setError(e.message || 'Scan failed')
      throw e
    } finally {
      setScanning(false)
    }
  }

  return { scanning, error, scanImage }
}

function resizeAndEncode(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1280
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
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      resolve(dataUrl.split(',')[1])
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}
