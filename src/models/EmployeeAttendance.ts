import mongoose, { type Document, Schema } from "mongoose"

export interface IEmployeeAttendance extends Document {
  _id: mongoose.Types.ObjectId
  employee_id: mongoose.Types.ObjectId
  date: Date
  status: "present" | "absent" | "leave" | "sick_leave" | "holiday"
  hours_worked: number
  notes?: string
  created_at: Date
  updated_at: Date
}

const employeeAttendanceSchema = new Schema<IEmployeeAttendance>(
  {
    employee_id: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "leave", "sick_leave", "holiday"],
      required: true,
    },
    hours_worked: { type: Number, default: 0, min: 0, max: 24 },
    notes: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

employeeAttendanceSchema.index({ employee_id: 1 })
employeeAttendanceSchema.index({ date: -1 })
employeeAttendanceSchema.index({ employee_id: 1, date: -1 })

const EmployeeAttendance = mongoose.model<IEmployeeAttendance>("EmployeeAttendance", employeeAttendanceSchema)
export default EmployeeAttendance
