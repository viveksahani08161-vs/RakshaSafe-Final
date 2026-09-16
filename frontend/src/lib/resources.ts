import type { IncidentLocation } from './incidents'

export interface Facility {
  id: string
  name: string
  facilityType: string
  locationId: string
  location: IncidentLocation | null
  phone: string
  capacity?: number
  isOperational: boolean
  operatingHours?: string
  createdAt: string
  updatedAt: string
}

export interface RescueTeam {
  id: string
  name: string
  teamType: string
  phone: string
  email?: string
  isActive: boolean
  specializations: string[]
  createdAt: string
  updatedAt: string
}

export const FACILITY_TYPES = ['Hospital', 'Shelter', 'Police Station', 'Fire Station', 'Relief Centre']

export const TEAM_TYPES = ['Police', 'Medical', 'Fire', 'Volunteer', 'NGO']

export function formatCoords(latitude: number, longitude: number, accuracy?: number): string {
  const base = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  return accuracy !== undefined ? `${base} (±${Math.round(accuracy)} m)` : base
}
