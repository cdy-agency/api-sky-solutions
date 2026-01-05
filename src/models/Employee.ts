import mongoose, { type Document, Schema } from "mongoose"

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  email: string
  phone: string
  position: string
  department?: string
  hire_date: Date
  end_date?: Date
  employment_type: "full-time" | "part-time" | "contract"
  salary: number
  currency: string
  benefits?: string[]
  status: "active" | "inactive" | "on_leave"
  emergency_contact?: string
  emergency_contact_phone?: string
  national_id?: string
  passport_number?: string
  created_at: Date
  updated_at: Date
}

const employeeSchema = new Schema<IEmployee>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    hire_date: { type: Date, required: true },
    end_date: { type: Date },
    employment_type: {
      type: String,
      enum: ["full-time", "part-time", "contract"],
      required: true,
    },
    salary: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "Frw" },
    benefits: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive", "on_leave"],
      default: "active",
    },
    emergency_contact: { type: String },
    emergency_contact_phone: { type: String },
    national_id: { type: String },
    passport_number: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

employeeSchema.index({ email: 1 })
employeeSchema.index({ status: 1 })
employeeSchema.index({ hire_date: -1 })

const Employee = mongoose.model<IEmployee>("Employee", employeeSchema)
export default Employee
