import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum IncidentType {
  SAFETY = 'Safety',
  DISASTER = 'Disaster',
}

export enum IncidentPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IncidentStatus {
  REPORTED = 'REPORTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export interface IIncident extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  type: IncidentType
  category: string
  description: string
  priority: IncidentPriority
  status: IncidentStatus
  locationId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

const IncidentSchema = new Schema<IIncident>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    type: { type: String, enum: IncidentType, required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: IncidentPriority, required: true },
    status: {
      type: String,
      enum: IncidentStatus,
      required: true,
      default: IncidentStatus.REPORTED,
    },
    locationId: { type: Schema.Types.ObjectId, ref: 'Locations', index: true },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
)

IncidentSchema.index({ userId: 1, createdAt: -1 })
IncidentSchema.index({ status: 1, createdAt: -1 })
IncidentSchema.index({ priority: 1, createdAt: -1 })
IncidentSchema.index({ type: 1, status: 1 })

export const Incident = mongoose.model<IIncident>('Incidents', IncidentSchema)