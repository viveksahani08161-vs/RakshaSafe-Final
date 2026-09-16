export interface DeviceCoords {
  latitude: number
  longitude: number
  accuracy?: number
}

export type LocationOutcome =
  | { state: 'available'; coords: DeviceCoords }
  | { state: 'denied' }
  | { state: 'timeout' }
  | { state: 'unavailable'; message: string }
  | { state: 'unsupported' }

export function isGeolocationSupported(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

function toOutcomeError(message: string): LocationOutcome {
  return { state: 'unavailable', message }
}

/**
 * Request the device/browser position once. Never invents coordinates:
 * every non-available outcome is reported explicitly so the UI can
 * communicate the actual state instead of assuming a false location.
 */
export function requestDeviceLocation(timeoutMs = 15000): Promise<LocationOutcome> {
  if (!isGeolocationSupported()) {
    return Promise.resolve({ state: 'unsupported' })
  }
  return new Promise((resolve) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (!settled) {
        settled = true
        resolve({ state: 'timeout' })
      }
    }, timeoutMs)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        const { latitude, longitude, accuracy } = pos.coords
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          resolve(toOutcomeError('The device returned an invalid position.'))
          return
        }
        resolve({
          state: 'available',
          coords: {
            latitude,
            longitude,
            ...(typeof accuracy === 'number' && Number.isFinite(accuracy) && accuracy >= 0
              ? { accuracy }
              : {}),
          },
        })
      },
      (err) => {
        if (settled) return
        settled = true
        window.clearTimeout(timer)
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ state: 'denied' })
        } else if (err.code === err.TIMEOUT) {
          resolve({ state: 'timeout' })
        } else {
          resolve(toOutcomeError(err.message || 'Position unavailable.'))
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    )
  })
}

export function describeOutcome(outcome: LocationOutcome): string {
  switch (outcome.state) {
    case 'available':
      return 'Device location acquired.'
    case 'denied':
      return 'Location permission was denied. You can still submit without coordinates.'
    case 'timeout':
      return 'Locating timed out. You can retry or submit without coordinates.'
    case 'unavailable':
      return outcome.message
    case 'unsupported':
      return 'This browser or device does not support geolocation.'
  }
}
