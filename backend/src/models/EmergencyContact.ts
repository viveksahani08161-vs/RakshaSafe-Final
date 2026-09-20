import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IEmergencyContact extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  name: string
  phone: string
  email?: string
  relationship?: string
  notifyViaSms: boolean
  notifyViaEmail: boolean
  isPrimary: boolean
  createdAt: Date
  updatedAt: Date
}

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Users', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    relationship: { type: String, trim: true },
    notifyViaSms: { type: Boolean, required: true, default: false },
    notifyViaEmail: { type: Boolean, required: true, default: false },
    isPrimary: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
)

// Ensure only one primary contact per user
EmergencyContactSchema.index(
  { userId: 1, isPrimary: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true } },
)

export const EmergencyContact = mongoose.model<IEmergencyContact>(
  'EmergencyContacts',
  EmergencyContactSchema,
)