import mongoose, { Schema, type Document, type Types } from 'mongoose'

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  RESPONDER = 'RESPONDER',
}

export interface IUser extends Document {
  _id: Types.ObjectId
  name: string
  email: string
  phone: string
  passwordHash: string
  role: UserRole
  language?: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: UserRole, required: true, default: UserRole.USER },
    language: { type: String, trim: true },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
)

export const User = mongoose.model<IUser>('Users', UserSchema)