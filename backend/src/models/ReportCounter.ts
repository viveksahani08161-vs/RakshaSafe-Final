import mongoose, { Schema, type Document } from 'mongoose'

/**
 * Atomic per-year sequence backing human-readable report serial numbers
 * (RPT-2026-000001). Single document per year, incremented with an atomic
 * findOneAndUpdate so concurrent generations never share a number — even
 * across deleted reports, numbers are never reused.
 */
export interface IReportCounter extends Document {
  year: number
  seq: number
}

const ReportCounterSchema = new Schema<IReportCounter>(
  {
    year: { type: Number, required: true, unique: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { timestamps: false, versionKey: false },
)

export const ReportCounter = mongoose.model<IReportCounter>('ReportCounters', ReportCounterSchema)
