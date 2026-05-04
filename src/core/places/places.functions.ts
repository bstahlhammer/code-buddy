/**
 * Google Places API (New) server functions.
 *
 * All calls go through createServerFn so the API key never leaves the server.
 * We use the v1 "Places API (New)" endpoints:
 *   - POST https://places.googleapis.com/v1/places:autocomplete
 *   - POST https://places.googleapis.com/v1/places:searchNearby
 *
 * Field masks keep us in the cheaper SKU tiers (Basic data only).
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const PLACE_TYPES = [
  'restaurant',
  'bar',
  'cafe',
  'liquor_store',
  'wine_bar',
  'food_store',
  'supermarket',
  'meal_takeaway',
]

export type PlaceSuggestion = {
  placeId: string
  primaryText: string
  secondaryText: string
}

export type PlaceDetail = {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
}

// ---------- Autocomplete ----------

const AutocompleteInput = z.object({
  query: z.string().trim().min(1).max(200),
  // Optional bias toward the user's location for better local results
  lat: z.number().optional(),
  lng: z.number().optional(),
  sessionToken: z.string().min(1).max(128),
})

export const placesAutocomplete = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AutocompleteInput.parse(input))
  .handler(async ({ data }): Promise<{ suggestions: PlaceSuggestion[]; error?: string }> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) return { suggestions: [], error: 'missing_api_key' }

    const body: Record<string, unknown> = {
      input: data.query,
      includedPrimaryTypes: PLACE_TYPES,
      sessionToken: data.sessionToken,
    }
    if (typeof data.lat === 'number' && typeof data.lng === 'number') {
      body.locationBias = {
        circle: {
          center: { latitude: data.lat, longitude: data.lng },
          radius: 20000, // 20km
        },
      }
    }

    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('Places autocomplete error', res.status, text)
        return { suggestions: [], error: `http_${res.status}` }
      }
      const json = await res.json()
      const suggestions: PlaceSuggestion[] = (json.suggestions || [])
        .map((s: { placePrediction?: { placeId?: string; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } }) => {
          const p = s.placePrediction
          if (!p?.placeId) return null
          return {
            placeId: p.placeId,
            primaryText: p.structuredFormat?.mainText?.text || '',
            secondaryText: p.structuredFormat?.secondaryText?.text || '',
          }
        })
        .filter(Boolean) as PlaceSuggestion[]
      return { suggestions }
    } catch (e) {
      console.error('placesAutocomplete failed', e)
      return { suggestions: [], error: 'unknown' }
    }
  })

// ---------- Place details (after user picks a suggestion) ----------

const DetailsInput = z.object({
  placeId: z.string().trim().min(1).max(300),
  sessionToken: z.string().min(1).max(128).optional(),
})

export const placesGetDetails = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DetailsInput.parse(input))
  .handler(async ({ data }): Promise<{ place: PlaceDetail | null; error?: string }> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) return { place: null, error: 'missing_api_key' }

    try {
      const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(data.placeId)}`)
      if (data.sessionToken) url.searchParams.set('sessionToken', data.sessionToken)

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': apiKey,
          // Basic-tier field mask (cheapest)
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
        },
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('Places details error', res.status, text)
        return { place: null, error: `http_${res.status}` }
      }
      const json = await res.json()
      if (!json?.id) return { place: null, error: 'not_found' }
      return {
        place: {
          placeId: json.id,
          name: json.displayName?.text || '',
          address: json.formattedAddress || '',
          lat: Number(json.location?.latitude) || 0,
          lng: Number(json.location?.longitude) || 0,
        },
      }
    } catch (e) {
      console.error('placesGetDetails failed', e)
      return { place: null, error: 'unknown' }
    }
  })

// ---------- Nearby search (auto-detect from GPS) ----------

const NearbyInput = z.object({
  lat: z.number(),
  lng: z.number(),
  radius: z.number().min(10).max(5000).optional(),
})

export const placesNearby = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NearbyInput.parse(input))
  .handler(async ({ data }): Promise<{ places: PlaceDetail[]; error?: string }> => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY
    if (!apiKey) return { places: [], error: 'missing_api_key' }

    try {
      const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
        },
        body: JSON.stringify({
          includedPrimaryTypes: PLACE_TYPES,
          maxResultCount: 10,
          rankPreference: 'DISTANCE',
          locationRestriction: {
            circle: {
              center: { latitude: data.lat, longitude: data.lng },
              radius: data.radius ?? 500,
            },
          },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('Places nearby error', res.status, text)
        return { places: [], error: `http_${res.status}` }
      }
      const json = await res.json()
      const places: PlaceDetail[] = (json.places || []).map((p: { id?: string; displayName?: { text?: string }; formattedAddress?: string; location?: { latitude?: number; longitude?: number } }) => ({
        placeId: p.id || '',
        name: p.displayName?.text || '',
        address: p.formattedAddress || '',
        lat: Number(p.location?.latitude) || 0,
        lng: Number(p.location?.longitude) || 0,
      })).filter((p: PlaceDetail) => p.placeId)
      return { places }
    } catch (e) {
      console.error('placesNearby failed', e)
      return { places: [], error: 'unknown' }
    }
  })
