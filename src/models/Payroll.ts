import mongoose, { type Document, Schema } from "mongoose"

export interface IPayroll extends Document {
  _id: mongoose.Types.ObjectId
  business_id: mongoose.Types.ObjectId
  employee_id: mongoose.Types.ObjectId
  period_start: Date
  period_end: Date
  salary: number
  deductions: number
  taxes: number
  net_amount: number
  status: "draft" | "processed" | "paid"
  payment_date?: Date
  payment_method?: string
  notes?: string
  created_at: Date
  updated_at: Date
}

const payrollSchema = new Schema<IPayroll>(
  {
    business_id: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: false,
    },
    employee_id: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    period_start: { type: Date, required: true },
    period_end: { type: Date, required: true },
    salary: { type: Number, required: true, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    taxes: { type: Number, default: 0, min: 0 },
    net_amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["draft", "processed", "paid"],
      default: "draft",
    },
    payment_date: { type: Date },
    payment_method: { type: String },
    notes: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

payrollSchema.index({ employee_id: 1 })
payrollSchema.index({ status: 1 })
payrollSchema.index({ period_end: -1 })
// payrollSchema.index({ employee_id: 1 })

const Payroll = mongoose.model<IPayroll>("Payroll", payrollSchema)
export default Payroll
