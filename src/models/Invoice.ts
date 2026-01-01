import mongoose, { type Document, Schema } from "mongoose"

export interface IInvoice extends Document {
  _id: mongoose.Types.ObjectId
  business_id: mongoose.Types.ObjectId
  vendor_name: string
  amount: number
  currency: string
  due_date: Date
  category: string
  description: string
  status: "pending" | "paid" | "overdue"
  payment_date?: Date
  payment_method?: string
  recurring: boolean
  frequency?: "weekly" | "monthly" | "quarterly" | "yearly"
  next_due_date?: Date
  notes?: string
  created_at: Date
  updated_at: Date
}

const invoiceSchema = new Schema<IInvoice>(
  {
    business_id: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    vendor_name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "USD" },
    due_date: { type: Date, required: true },
    category: {
      type: String,
      enum: ["utilities", "rent", "supplies", "services", "subscriptions", "other"],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "paid", "overdue"],
      default: "pending",
    },
    payment_date: { type: Date },
    payment_method: { type: String },
    recurring: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "quarterly", "yearly"],
    },
    next_due_date: { type: Date },
    notes: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

invoiceSchema.index({ business_id: 1 })
invoiceSchema.index({ due_date: -1 })
invoiceSchema.index({ status: 1 })
invoiceSchema.index({ business_id: 1, status: 1 })

const Invoice = mongoose.model<IInvoice>("Invoice", invoiceSchema)
export default Invoice
