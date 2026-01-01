import mongoose, { type Document, Schema } from "mongoose"

export interface IShareRequest extends Document {
  _id: mongoose.Types.ObjectId
  investor_id: mongoose.Types.ObjectId
  business_id: mongoose.Types.ObjectId
  requested_shares: number
  share_value: number
  total_amount: number
  status: "pending" | "approved" | "rejected"
  rejection_reason?: string
  created_at: Date
  updated_at: Date
}

const shareRequestSchema = new Schema<IShareRequest>(
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
    requested_shares: { type: Number, required: true, min: 1 },
    share_value: { type: Number, required: true, min: 0 },
    total_amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejection_reason: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

shareRequestSchema.index({ investor_id: 1 })
shareRequestSchema.index({ business_id: 1 })
shareRequestSchema.index({ status: 1 })
shareRequestSchema.index({ created_at: -1 })

const ShareRequest = mongoose.model<IShareRequest>("ShareRequest", shareRequestSchema)
export default ShareRequest
