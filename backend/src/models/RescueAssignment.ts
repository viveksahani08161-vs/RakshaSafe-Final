import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum AssignmentStatus {
  ASSIGNED = 'ASSIGNED',
  EN_ROUTE = 'EN_ROUTE',
  ON_SCENE = 'ON_SCENE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface IRescueAssignment extends Document {
  _id: Types.ObjectId
  incidentId: Types.ObjectId
  teamId: Types.ObjectId
  assignedBy: Types.ObjectId
  assignedAt: Date
  status: AssignmentStatus
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const RescueAssignmentSchema = new Schema<IRescueAssignment>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incidents', required: true, index: true },
    teamId: { type: Schema.Types.ObjectId, ref: 'RescueTeams', required: true, index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    assignedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: AssignmentStatus,
      required: true,
      default: AssignmentStatus.ASSIGNED,
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
)

RescueAssignmentSchema.index({ incidentId: 1, status: 1 })
RescueAssignmentSchema.index({ teamId: 1, status: 1 })
RescueAssignmentSchema.index({ assignedBy: 1 })

export const RescueAssignment = mongoose.model<IRescueAssignment>(
  'RescueAssignments',
  RescueAssignmentSchema,
)