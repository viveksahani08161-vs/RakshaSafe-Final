import type { NextFunction, Request, Response } from 'express'
import type mongoose from 'mongoose'
import type { PipelineStage } from 'mongoose'
import { AdminLog } from '../models/AdminLog.js'
import { Facility } from '../models/Facility.js'
import { Incident, IncidentStatus } from '../models/Incident.js'
import { Notification } from '../models/Notification.js'
import { RescueAssignment } from '../models/RescueAssignment.js'
import { RescueTeam } from '../models/RescueTeam.js'
import { RiskAssessment } from '../models/RiskAssessment.js'
import { UnsafeAreaReport } from '../models/UnsafeAreaReport.js'
import { User } from '../models/User.js'

const ACTIVE_INCIDENT_STATUSES = [
  IncidentStatus.REPORTED,
  IncidentStatus.ACKNOWLEDGED,
  IncidentStatus.ASSIGNED,
  IncidentStatus.IN_PROGRESS,
]

type AnyModel = mongoose.Model<any>;

interface GroupRow {
  _id: unknown
  count: number
}

async function groupRows(model: AnyModel, pipeline: PipelineStage[]): Promise<GroupRow[]> {
  const rows = (await model.aggregate(pipeline)) as GroupRow[]
  return rows.filter((row) => typeof row.count === 'number')
}

/** Count documents grouped by a field: [{ _id, count }] -> Record. */
async function countBy(model: AnyModel, field: string): Promise<Record<string, number>> {
  const rows = await groupRows(model, [{ $group: { _id: `$${field}`, count: { $sum: 1 } } }])
  const out: Record<string, number> = {}
  for (const row of rows) {
    if (typeof row._id === 'string') out[row._id] = row.count
  }
  return out
}

async function topBy(model: AnyModel, field: string, limit: number): Promise<{ value: string; count: number }[]> {
  const rows = await groupRows(model, [
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
  ])
  return rows
    .filter((row) => typeof row._id === 'string')
    .map((row) => ({ value: row._id as string, count: row.count }))
}

/**
 * GET /api/admin/dashboard — every number comes from a live MongoDB
 * aggregation over the existing collections. No stored PII, secrets, or
 * hashes are included; timestamps are UTC ISO strings.
 */
export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [
      userCount,
      incidentStatus,
      incidentPriority,
      incidentType,
      recentIncidents,
      teamActive,
      teamInactive,
      assignmentStatus,
      assignmentCount,
      facilityOperational,
      facilityNonOperational,
      facilityType,
      facilityCount,
      reportVerified,
      reportUnverified,
      reportCategories,
      reportSeverities,
      reportCount,
      riskLevels,
      riskCount,
      recentRisk,
      notificationStatus,
      notificationChannel,
      notificationCount,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments(),
      countBy(Incident, 'status'),
      countBy(Incident, 'priority'),
      countBy(Incident, 'type'),
      Incident.find().sort({ createdAt: -1 }).limit(5).select('category type priority status createdAt'),
      RescueTeam.countDocuments({ isActive: true }),
      RescueTeam.countDocuments({ isActive: false }),
      countBy(RescueAssignment, 'status'),
      RescueAssignment.countDocuments(),
      Facility.countDocuments({ isOperational: true }),
      Facility.countDocuments({ isOperational: false }),
      countBy(Facility, 'facilityType'),
      Facility.countDocuments(),
      UnsafeAreaReport.countDocuments({ isVerified: true }),
      UnsafeAreaReport.countDocuments({ isVerified: false }),
      topBy(UnsafeAreaReport, 'category', 8),
      topBy(UnsafeAreaReport, 'severity', 8),
      UnsafeAreaReport.countDocuments(),
      countBy(RiskAssessment, 'riskLevel'),
      RiskAssessment.countDocuments(),
      RiskAssessment.find().sort({ assessedAt: -1 }).limit(5).select('riskScore riskLevel modelVersion assessedAt'),
      countBy(Notification, 'status'),
      countBy(Notification, 'channel'),
      Notification.countDocuments(),
      AdminLog.find().sort({ createdAt: -1 }).limit(8).select('adminId action targetType createdAt'),
    ])

    const incidentTotal = Object.values(incidentStatus).reduce((a, b) => a + b, 0)
    const incidentActive = ACTIVE_INCIDENT_STATUSES.reduce((a, s) => a + (incidentStatus[s] ?? 0), 0)

    res.json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        users: { total: userCount },
        incidents: {
          total: incidentTotal,
          active: incidentActive,
          byStatus: incidentStatus,
          byPriority: incidentPriority,
          byType: incidentType,
          recent: recentIncidents.map((i) => ({
            id: String(i._id),
            category: i.category,
            type: i.type,
            priority: i.priority,
            status: i.status,
            createdAt: i.createdAt,
          })),
        },
        teams: { total: teamActive + teamInactive, active: teamActive, inactive: teamInactive },
        assignments: {
          total: assignmentCount,
          byStatus: assignmentStatus,
        },
        facilities: {
          total: facilityCount,
          operational: facilityOperational,
          nonOperational: facilityNonOperational,
          byType: facilityType,
        },
        unsafeReports: {
          total: reportCount,
          verified: reportVerified,
          unverified: reportUnverified,
          byCategory: reportCategories,
          bySeverity: reportSeverities,
        },
        risk: {
          total: riskCount,
          byLevel: riskLevels,
          recent: recentRisk.map((r) => ({
            id: String(r._id),
            riskScore: r.riskScore,
            riskLevel: r.riskLevel,
            modelVersion: r.modelVersion,
            assessedAt: r.assessedAt,
          })),
        },
        notifications: {
          total: notificationCount,
          byStatus: notificationStatus,
          byChannel: notificationChannel,
        },
        recentActivity: recentActivity.map((a) => ({
          id: String(a._id),
          adminId: String(a.adminId),
          action: a.action,
          targetType: a.targetType,
          createdAt: a.createdAt,
        })),
      },
    })
  } catch (err) {
    next(err)
  }
}
