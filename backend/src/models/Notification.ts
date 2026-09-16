import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum NotificationChannel {
  EMAIL = 'Email',
  SMS = 'SMS',
  WHATSAPP = 'WhatsApp',
  IN_APP = 'In-App',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  UNAVAILABLE = 'UNAVAILABLE',
}

export interface INotification extends Document {
  _id: Types.ObjectId
  incidentId: Types.ObjectId
  contactId?: Types.ObjectId
  channel: NotificationChannel
  status: NotificationStatus
  providerResponse?: string
  attemptCount: number
  lastAttemptAt?: Date
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incidents', required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'EmergencyContacts', index: true },
    channel: { type: String, enum: NotificationChannel, required: true },
    status: {
      type: String,
      enum: NotificationStatus,
      required: true,
      default: NotificationStatus.QUEUED,
    },
    providerResponse: { type: String, trim: true },
    attemptCount: { type: Number, required: true, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
  },
  { timestamps: true },
)

NotificationSchema.index({ incidentId: 1, createdAt: -1 })
NotificationSchema.index({ status: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>(
  'Notifications',
  NotificationSchema,
)