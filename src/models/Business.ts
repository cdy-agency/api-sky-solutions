import mongoose, { type Document, Schema } from "mongoose"

export interface IBusiness extends Document {
  _id: mongoose.Types.ObjectId
  entrepreneur_id?: mongoose.Types.ObjectId
  title: string
  category_id: mongoose.Types.ObjectId
  business_plan_url?: string
  business_plan_public_id?: string
  description?: string
  image_url?: string
  image_public_id?: string
  pdf_url?: string
  pdf_public_id?: string
  total_shares: number
  remaining_shares: number
  share_value: number
  minimum_shares_per_request?: number
  status: "pending" | "in_review" | "approved" | "rejected" | "active"
  type: "submission" | "public"
  submission_id?: mongoose.Types.ObjectId
  rejection_reason?: string
  created_at: Date
  updated_at: Date
}

const businessSchema = new Schema<IBusiness>(
  {
    entrepreneur_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    title: { type: String, required: true, trim: true },
    category_id: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    business_plan_url: { type: String },
    business_plan_public_id: { type: String },
    description: { type: String },
    image_url: { type: String },
    image_public_id: { type: String },
    pdf_url: { type: String },
    pdf_public_id: { type: String },
    total_shares: { type: Number, default: 0 },
    remaining_shares: { type: Number, default: 0 },
    share_value: { type: Number, default: 0 },
    minimum_shares_per_request: { type: Number },
    status: {
      type: String,
      enum: ["pending", "in_review", "approved", "rejected", "active"],
      default: "pending",
    },
    type: {
      type: String,
      enum: ["submission", "public"],
      default: "submission",
    },
    submission_id: {
      type: Schema.Types.ObjectId,
      ref: "Business",
    },
    rejection_reason: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

businessSchema.index({ entrepreneur_id: 1 })
businessSchema.index({ status: 1 })
businessSchema.index({ type: 1 })
businessSchema.index({ created_at: -1 })
businessSchema.index({ entrepreneur_id: 1, type: 1 })

const Business = mongoose.model<IBusiness>("Business", businessSchema)
export default Business
