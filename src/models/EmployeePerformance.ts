import mongoose, { type Document, Schema } from "mongoose"

export interface IEmployeePerformance extends Document {
  _id: mongoose.Types.ObjectId
  employee_id: mongoose.Types.ObjectId
  review_date: Date
  rating: number
  feedback: string
  strengths?: string
  improvements?: string
  reviewer_id: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
}

const employeePerformanceSchema = new Schema<IEmployeePerformance>(
  {
    employee_id: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    review_date: { type: Date, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    feedback: { type: String, required: true, trim: true },
    strengths: { type: String },
    improvements: { type: String },
    reviewer_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

employeePerformanceSchema.index({ employee_id: 1 })
employeePerformanceSchema.index({ review_date: -1 })

const EmployeePerformance = mongoose.model<IEmployeePerformance>("EmployeePerformance", employeePerformanceSchema)
export default EmployeePerformance
