import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum TeamType {
  POLICE = 'Police',
  MEDICAL = 'Medical',
  FIRE = 'Fire',
  NGO = 'NGO',
  VOLUNTEER = 'Volunteer',
}

export interface IRescueTeam extends Document {
  _id: Types.ObjectId
  name: string
  teamType: TeamType
  phone: string
  email?: string
  isActive: boolean
  specializations?: string[]
  members: Types.ObjectId[]
  /**
   * Optional link to the shared Locations collection. Absent for teams
   * created before location support or for teams without a fixed base —
   * never fabricated, never defaulted.
   */
  locationId?: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const RescueTeamSchema = new Schema<IRescueTeam>(
  {
    name: { type: String, required: true, trim: true },
    teamType: { type: String, enum: TeamType, required: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    isActive: { type: Boolean, required: true, default: true },
    specializations: { type: [String], default: [] },
    members: { type: [Schema.Types.ObjectId], ref: 'Users', default: [] },
    locationId: { type: Schema.Types.ObjectId, ref: 'Locations', index: true },
  },
  { timestamps: true },
)

RescueTeamSchema.index({ teamType: 1, isActive: 1 })
RescueTeamSchema.index({ name: 1 })

export const RescueTeam = mongoose.model<IRescueTeam>('RescueTeams', RescueTeamSchema)