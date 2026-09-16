import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IRiskZone extends Document {
  _id: Types.ObjectId
  name: string
  riskLevel: string
  geometry: object
  factors?: string[]
  lastAssessedAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const RiskZoneSchema = new Schema<IRiskZone>(
  {
    name: { type: String, required: true, trim: true },
    riskLevel: { type: String, required: true, trim: true },
    geometry: { type: Schema.Types.Mixed, required: true },
    factors: { type: [String], default: [] },
    lastAssessedAt: { type: Date },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
)

RiskZoneSchema.index({ name: 1 })
RiskZoneSchema.index({ riskLevel: 1, isActive: 1 })

export const RiskZone = mongoose.model<IRiskZone>('RiskZones', RiskZoneSchema)