import mongoose, { type Document, Schema } from "mongoose"

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId
  business_id: mongoose.Types.ObjectId
  category: string
  amount: number
  date: Date
  description: string
  payment_method: "cash" | "credit_card" | "bank_transfer" | "check"
  receipt_url?: string
  receipt_public_id?: string
  tags: string[]
  status: "pending" | "approved" | "rejected"
  created_by: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
}

const expenseSchema = new Schema<IExpense>(
  {
    business_id: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    category: {
      type: String,
      enum: ["salary", "utilities", "supplies", "marketing", "rent", "equipment", "travel", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, required: true, trim: true },
    payment_method: {
      type: String,
      enum: ["cash", "credit_card", "bank_transfer", "check"],
      required: true,
    },
    receipt_url: { type: String },
    receipt_public_id: { type: String },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

expenseSchema.index({ business_id: 1 })
expenseSchema.index({ date: -1 })
expenseSchema.index({ category: 1 })
expenseSchema.index({ status: 1 })
expenseSchema.index({ business_id: 1, date: -1 })
expenseSchema.index({ business_id: 1, category: 1 })

const Expense = mongoose.model<IExpense>("Expense", expenseSchema)
export default Expense
