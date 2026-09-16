import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum ReportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  JSON = 'JSON',
}

export interface IReport extends Document {
  _id: Types.ObjectId
  generatedBy: Types.ObjectId
  title: string
  reportType: string
  filters?: Record<string, unknown>
  dataSnapshot?: Record<string, unknown>
  format: ReportFormat
  createdAt: Date
  expiresAt?: Date
}

const ReportSchema = new Schema<IReport>(
  {
    generatedBy: { type: Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    title: { type: String, required: true, trim: true },
    reportType: { type: String, required: true, trim: true },
    filters: { type: Schema.Types.Mixed },
    dataSnapshot: { type: Schema.Types.Mixed },
    format: { type: String, enum: ReportFormat, required: true },
    expiresAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

ReportSchema.index({ generatedBy: 1, createdAt: -1 })
ReportSchema.index({ reportType: 1, createdAt: -1 })

export const Report = mongoose.model<IReport>('Reports', ReportSchema)