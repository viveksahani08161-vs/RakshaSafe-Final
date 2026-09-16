import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IAdminLog extends Document {
  _id: Types.ObjectId
  adminId: Types.ObjectId
  action: string
  targetType: string
  targetId?: Types.ObjectId
  details?: string
  ipAddress?: string
  createdAt: Date
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    action: { type: String, required: true, trim: true },
    targetType: { type: String, required: true, trim: true },
    targetId: { type: Schema.Types.ObjectId, index: true },
    details: { type: String, trim: true },
    ipAddress: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

AdminLogSchema.index({ adminId: 1, createdAt: -1 })
AdminLogSchema.index({ targetType: 1, targetId: 1 })
AdminLogSchema.index({ action: 1, createdAt: -1 })

export const AdminLog = mongoose.model<IAdminLog>('AdminLogs', AdminLogSchema)