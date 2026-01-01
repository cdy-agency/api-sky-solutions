import mongoose, { type Document, Schema } from "mongoose"
import bcrypt from "bcryptjs"

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  phone: string
  email: string
  location: string
  password: string
  role: "admin" | "entrepreneur" | "investor"
  is_active: boolean
  avatar_url?: string
  terms_accepted: boolean
  terms_accepted_at?: Date
  intake_completed: boolean
  intake_completed_at?: Date
  verification_token?: string
  verification_token_expires?: Date
  created_at: Date
  updated_at: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    location: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["admin", "entrepreneur", "investor"],
      required: true,
    },
    is_active: { type: Boolean, default: false },
    avatar_url: { type: String },
    terms_accepted: { type: Boolean, default: false },
    terms_accepted_at: { type: Date },
    intake_completed: { type: Boolean, default: false },
    intake_completed_at: { type: Date },
    verification_token: { type: String },
    verification_token_expires: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

userSchema.index({ email: 1 })
userSchema.index({ role: 1 })
userSchema.index({ created_at: -1 })
userSchema.index({ is_active: 1 })

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  this.password = await bcrypt.hash(this.password, 12)
  next()
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

const User = mongoose.model<IUser>("User", userSchema)
export default User
