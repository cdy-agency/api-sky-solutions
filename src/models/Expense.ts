import mongoose, { type Document, Schema } from "mongoose"

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  category: string
  amount: number
  type: "one_time" | "recursive"
  priority: "high" | "medium" | "low"
  due_date: Date
  paid_date?: Date
  description?: string
  payment_method?: "cash" | "credit_card" | "bank_transfer" | "check"
  receipt_url?: string
  receipt_public_id?: string
  tags: string[]
  status: "active" | "paid" | "pending" | "overdue" | "stopped"
  // For recursive expenses
  frequency?: "days" | "month" | "quarter" | "half" | "year"
  frequency_value?: number // For days frequency (e.g., every 7 days)
  parent_id?: mongoose.Types.ObjectId // Reference to parent recursive expense
  is_active?: boolean // For recursive expenses (active/stopped)
  created_by: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
}

const expenseSchema = new Schema<IExpense>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["salary", "utilities", "supplies", "marketing", "rent", "equipment", "travel", "other"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    type: {
      type: String,
      enum: ["one_time", "recursive"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    due_date: { type: Date, required: true },
    paid_date: { type: Date },
    description: { type: String, trim: true },
    payment_method: {
      type: String,
      enum: ["cash", "credit_card", "bank_transfer", "check"],
    },
    receipt_url: { type: String },
    receipt_public_id: { type: String },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "paid", "pending", "overdue", "stopped"],
      default: "active",
    },
    // Recursive expense fields
    frequency: {
      type: String,
      enum: ["days", "month", "quarter", "half", "year"],
    },
    frequency_value: { type: Number }, // For days (e.g., every 7 days)
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "Expense",
    },
    is_active: { type: Boolean, default: true },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

// Indexes
expenseSchema.index({ due_date: -1 })
expenseSchema.index({ category: 1 })
expenseSchema.index({ status: 1 })
expenseSchema.index({ type: 1 })
expenseSchema.index({ parent_id: 1 })
expenseSchema.index({ is_active: 1 })
expenseSchema.index({ due_date: 1, status: 1 })

// Auto-update status to overdue for recursive expenses past due date
expenseSchema.pre("save", function (next) {
  if (this.type === "recursive" && this.status === "pending" && this.due_date < new Date()) {
    this.status = "overdue"
  }
  next()
})

const Expense = mongoose.model<IExpense>("Expense", expenseSchema)
export default Expense
