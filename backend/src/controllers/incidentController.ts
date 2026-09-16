import type { NextFunction, Request, Response } from 'express'
import { Incident, IncidentStatus, type IIncident } from '../models/Incident.js'
import { Location, type ILocation } from '../models/Location.js'
import { IncidentUpdate } from '../models/IncidentUpdate.js'
import { RescueAssignment } from '../models/RescueAssignment.js'
import { attachTeams } from './adminAssignmentController.js'
import { badRequest, notFoundError, unauthorized } from '../utils/errors.js'
import { recordEventSafe } from '../services/notifications.js'
import { isValidObjectId } from '../validators/emergencyContact.js'
import { validateIncidentCreate } from '../validators/incident.js'

interface SafeIncident {
  id: string
  userId: string
  type: string
  category: string
  description: string
  priority: string
  status: string
  locationId?: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface SafeLocation {
  id: string
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  country?: string
  accuracy?: number
}

/** Owner-scoped location payload — only ever served alongside its own incident. */
export function toSafeLocation(doc: ILocation): SafeLocation {
  return {
    id: String(doc._id),
    latitude: doc.latitude,
    longitude: doc.longitude,
    ...(doc.address ? { address: doc.address } : {}),
    ...(doc.city ? { city: doc.city } : {}),
    ...(doc.state ? { state: doc.state } : {}),
    ...(doc.country ? { country: doc.country } : {}),
    ...(doc.accuracy !== undefined ? { accuracy: doc.accuracy } : {}),
  }
}

export function toSafeIncident(doc: IIncident): SafeIncident {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    type: doc.type,
    category: doc.category,
    description: doc.description,
    priority: doc.priority,
    status: doc.status,
    ...(doc.locationId ? { locationId: String(doc.locationId) } : {}),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ...(doc.resolvedAt ? { resolvedAt: doc.resolvedAt } : {}),
  }
}

function requireOwnerId(req: Request): string {
  const userId = req.auth?.userId
  if (!userId) throw unauthorized('Authentication required.')
  return userId
}

/**
 * POST /api/incidents
 * Owner and initial status are server-owned: userId comes from the JWT and
 * status is always REPORTED. A client-supplied status/userId is never trusted.
 */
export async function createIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { input, issues } = validateIncidentCreate(req.body)
    if (!input || issues) {
      next(badRequest('Invalid incident data.', issues))
      return
    }

    let locationId = input.locationId
    if (input.location) {
      const created = await Location.create(input.location)
      locationId = String(created._id)
    } else if (locationId) {
      const exists = await Location.findById(locationId).select('_id').lean()
      if (!exists) {
        next(badRequest('Invalid incident data.', [{ field: 'locationId', message: 'Location not found.' }]))
        return
      }
    }

    const doc = await Incident.create({
      userId: ownerId,
      type: input.type,
      category: input.category,
      description: input.description,
      priority: input.priority,
      status: IncidentStatus.REPORTED,
      ...(locationId ? { locationId } : {}),
    })

    // Real event, recorded only because creation succeeded. Best-effort:
    // a notification write failure never fails the incident itself.
    await recordEventSafe(String(doc._id), ownerId, { kind: 'incident.created' })

    res.status(201).json({ success: true, data: { incident: toSafeIncident(doc) } })
  } catch (err) {
    next(err)
  }
}

/** GET /api/incidents — only the caller's own incidents, newest first. */
export async function listIncidents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const docs = await Incident.find({ userId: ownerId }).sort({ createdAt: -1 })
    res.json({ success: true, data: { incidents: docs.map(toSafeIncident) } })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/incidents/:id
 * Scoped lookup `{ _id, userId }`: another user's id yields 404, never their data.
 * Includes the linked location record and the visible assignment information
 * (team name/type/phone + status) for the caller's own incident.
 */
export async function getIncident(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }

    const doc = await Incident.findOne({ _id: id, userId: ownerId })
    if (!doc) {
      next(notFoundError('Incident not found.'))
      return
    }
    const [location, assignmentDocs] = await Promise.all([
      doc.locationId ? Location.findById(doc.locationId) : Promise.resolve(null),
      RescueAssignment.find({ incidentId: doc._id }).sort({ createdAt: -1 }),
    ])
    // User view carries only response-facing fields: no assignedBy, no internal notes.
    const assignments = (await attachTeams(assignmentDocs)).map((a) => ({
      id: a.id,
      team: a.team,
      status: a.status,
      assignedAt: a.assignedAt,
    }))
    res.json({
      success: true,
      data: {
        incident: toSafeIncident(doc),
        location: location ? toSafeLocation(location) : null,
        assignments,
      },
    })
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/incidents/:id/updates — chronological history of the caller's own
 * incident, oldest first. Scoped lookup: another user's id yields 404.
 */
export async function listIncidentUpdates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ownerId = requireOwnerId(req)
    const { id } = req.params
    if (!isValidObjectId(id)) {
      next(badRequest('Invalid incident id.'))
      return
    }

    const doc = await Incident.findOne({ _id: id, userId: ownerId }).select('_id')
    if (!doc) {
      next(notFoundError('Incident not found.'))
      return
    }
    const updates = await IncidentUpdate.find({ incidentId: doc._id }).sort({ createdAt: 1 })
    res.json({
      success: true,
      data: {
        updates: updates.map((u) => ({
          id: String(u._id),
          statusFrom: u.statusFrom ?? null,
          statusTo: u.statusTo,
          ...(u.comment ? { comment: u.comment } : {}),
          updatedBy: String(u.updatedBy),
          createdAt: u.createdAt,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}
