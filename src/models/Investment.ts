import mongoose, { type Document, Schema } from "mongoose"

export interface IInvestment extends Document {
  _id: mongoose.Types.ObjectId
  investor_id: mongoose.Types.ObjectId
  business_id: mongoose.Types.ObjectId
  amount: number
  status: "pending" | "approved" | "rejected"
  created_at: Date
  updated_at: Date
}

const investmentSchema = new Schema<IInvestment>(
  {
    investor_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    business_id: {
      type: Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

const Investment = mongoose.model<IInvestment>("Investment", investmentSchema)
export default Investment
