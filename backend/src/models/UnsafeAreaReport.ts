import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IUnsafeAreaReport extends Document {
  _id: Types.ObjectId
  reportedBy: Types.ObjectId
  locationId: Types.ObjectId
  category: string
  description: string
  severity: string
  isVerified: boolean
  createdAt: Date
  updatedAt: Date
}

const UnsafeAreaReportSchema = new Schema<IUnsafeAreaReport>(
  {
    reportedBy: { type: Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Locations', required: true, index: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    severity: { type: String, required: true, trim: true },
    isVerified: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
)

UnsafeAreaReportSchema.index({ reportedBy: 1, createdAt: -1 })
UnsafeAreaReportSchema.index({ isVerified: 1, createdAt: -1 })

export const UnsafeAreaReport = mongoose.model<IUnsafeAreaReport>(
  'UnsafeAreaReports',
  UnsafeAreaReportSchema,
)