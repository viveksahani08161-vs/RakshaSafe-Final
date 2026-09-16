import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IIncidentUpdate extends Document {
  _id: Types.ObjectId
  incidentId: Types.ObjectId
  updatedBy: Types.ObjectId
  statusFrom?: string
  statusTo: string
  comment?: string
  createdAt: Date
}

const IncidentUpdateSchema = new Schema<IIncidentUpdate>(
  {
    incidentId: { type: Schema.Types.ObjectId, ref: 'Incidents', required: true, index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Users', required: true },
    statusFrom: { type: String, trim: true },
    statusTo: { type: String, required: true, trim: true },
    comment: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

IncidentUpdateSchema.index({ incidentId: 1, createdAt: -1 })

export const IncidentUpdate = mongoose.model<IIncidentUpdate>(
  'IncidentUpdates',
  IncidentUpdateSchema,
)