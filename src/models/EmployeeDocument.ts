import mongoose, { type Document, Schema } from "mongoose"

export interface IEmployeeDocument extends Document {
  _id: mongoose.Types.ObjectId
  employee_id: mongoose.Types.ObjectId
  document_type: "contract" | "payslip" | "performance_review" | "certification" | "other"
  document_url: string
  document_public_id: string
  file_name: string
  upload_date: Date
  created_at: Date
  updated_at: Date
}

const employeeDocumentSchema = new Schema<IEmployeeDocument>(
  {
    employee_id: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    document_type: {
      type: String,
      enum: ["contract", "payslip", "performance_review", "certification", "other"],
      required: true,
    },
    document_url: { type: String, required: true },
    document_public_id: { type: String, required: true },
    file_name: { type: String, required: true, trim: true },
    upload_date: { type: Date, default: Date.now },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

employeeDocumentSchema.index({ employee_id: 1 })
employeeDocumentSchema.index({ document_type: 1 })

const EmployeeDocument = mongoose.model<IEmployeeDocument>("EmployeeDocument", employeeDocumentSchema)
export default EmployeeDocument
