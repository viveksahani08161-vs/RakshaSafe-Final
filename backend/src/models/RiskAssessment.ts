import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface IRiskAssessment extends Document {
  _id: Types.ObjectId
  locationId: Types.ObjectId
  riskScore: number
  riskLevel: RiskLevel
  modelVersion: string
  inputFactors?: Record<string, unknown>[]
  assessedAt: Date
  createdAt: Date
}

const RiskAssessmentSchema = new Schema<IRiskAssessment>(
  {
    locationId: { type: Schema.Types.ObjectId, ref: 'Locations', required: true, index: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: RiskLevel, required: true },
    modelVersion: { type: String, required: true, trim: true },
    inputFactors: { type: [Schema.Types.Mixed], default: [] },
    assessedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
)

RiskAssessmentSchema.index({ locationId: 1, assessedAt: -1 })
RiskAssessmentSchema.index({ riskLevel: 1, assessedAt: -1 })

export const RiskAssessment = mongoose.model<IRiskAssessment>(
  'RiskAssessments',
  RiskAssessmentSchema,
)