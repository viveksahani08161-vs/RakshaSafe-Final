import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum FacilityType {
  HOSPITAL = 'Hospital',
  SHELTER = 'Shelter',
  POLICE_STATION = 'Police Station',
  FIRE_STATION = 'Fire Station',
  RELIEF_CENTRE = 'Relief Centre',
}

export interface IFacility extends Document {
  _id: Types.ObjectId
  name: string
  facilityType: FacilityType
  locationId: Types.ObjectId
  phone: string
  capacity?: number
  isOperational: boolean
  operatingHours?: string
  createdAt: Date
  updatedAt: Date
}

const FacilitySchema = new Schema<IFacility>(
  {
    name: { type: String, required: true, trim: true },
    facilityType: { type: String, enum: FacilityType, required: true },
    locationId: { type: Schema.Types.ObjectId, ref: 'Locations', required: true, index: true },
    phone: { type: String, required: true, trim: true },
    capacity: { type: Number, min: 0 },
    isOperational: { type: Boolean, required: true, default: true },
    operatingHours: { type: String, trim: true },
  },
  { timestamps: true },
)

FacilitySchema.index({ facilityType: 1, isOperational: 1 })
FacilitySchema.index({ name: 1 })

export const Facility = mongoose.model<IFacility>('Facilities', FacilitySchema)