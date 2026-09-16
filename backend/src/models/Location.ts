import mongoose, { Schema, type Document, type Types } from 'mongoose'

export interface ILocation extends Document {
  _id: Types.ObjectId
  latitude: number
  longitude: number
  address?: string
  city?: string
  state?: string
  country?: string
  accuracy?: number
  createdAt: Date
  updatedAt: Date
}

const LocationSchema = new Schema<ILocation>(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    accuracy: { type: Number, min: 0 },
  },
  { timestamps: true },
)

LocationSchema.index({ latitude: 1, longitude: 1 })
LocationSchema.index({ city: 1, state: 1, country: 1 })

export const Location = mongoose.model<ILocation>('Locations', LocationSchema)