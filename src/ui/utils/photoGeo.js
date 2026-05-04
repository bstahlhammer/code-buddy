import exifr from 'exifr'
import { findNearbyPlaces } from '@/core/api'

/**
 * Read GPS coordinates from a photo file's EXIF metadata.
 * Returns { lat, lng } or null if no geotag.
 */
export async function readPhotoGps(file) {
  if (!file) return null
  try {
    const gps = await exifr.gps(file)
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      return { lat: gps.latitude, lng: gps.longitude }
    }
  } catch (e) {
    console.warn('exif read failed', e)
  }
  return null
}

/**
 * If the photo has GPS, ask Maps for the nearest restaurant/store/wine
 * spot and return a place suitable for saveScan({ place }).
 */
export async function placeFromPhoto(file) {
  const gps = await readPhotoGps(file)
  if (!gps) return null
  try {
    const { places } = await findNearbyPlaces({ lat: gps.lat, lng: gps.lng, radius: 250 })
    if (places && places.length) return places[0]
  } catch (e) {
    console.warn('nearby lookup failed', e)
  }
  return null
}
