import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface IDisasterCategory extends Document {
  _id: Types.ObjectId
  name: string
  code: string
  description?: string
  defaultPriority: string
  requiresResponseTeam: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const DisasterCategorySchema = new Schema<IDisasterCategory>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    defaultPriority: { type: String, required: true, trim: true },
    requiresResponseTeam: { type: Boolean, required: true, default: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
)

DisasterCategorySchema.index({ isActive: 1 })

export const DisasterCategory = mongoose.model<IDisasterCategory>(
  'DisasterCategories',
  DisasterCategorySchema,
)