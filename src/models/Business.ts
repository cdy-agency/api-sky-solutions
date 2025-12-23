import mongoose, { type Document, Schema } from "mongoose"

export interface IBusiness extends Document {
  _id: mongoose.Types.ObjectId
  entrepreneur_id?: mongoose.Types.ObjectId
  title: string
  category_id: mongoose.Types.ObjectId
  business_plan_url?: string
  business_plan_download_url: string
  business_plan_public_id?: string
  description?: string
  image_url?: string
  image_public_id?: string
  pdf_url?: string
  pdf_public_id?: string
  needed_funds?: number
  funded_amount: number
  status: "pending" | "approved" | "rejected" | "active"
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
      required: true,
    },
    business_plan_url: { type: String },
    business_plan_public_id: { type: String },
    description: { type: String },
    image_url: { type: String },
    image_public_id: { type: String },
    business_plan_download_url: { type: String },
    pdf_url: { type: String },
    pdf_public_id: { type: String },
    needed_funds: { type: Number, min: 0 },
    funded_amount: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "active"],
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

const Business = mongoose.model<IBusiness>("Business", businessSchema)
export default Business
