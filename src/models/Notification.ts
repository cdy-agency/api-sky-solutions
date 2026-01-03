import mongoose, { type Document, Schema } from "mongoose"

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId
  user_id: mongoose.Types.ObjectId
  type: "business_status" | "user_status" | "share_request" | "share_approved" | "document_uploaded"| "internal_message"| "intake_status"| "review_status" 
  title: string
  message: string
  related_id?: mongoose.Types.ObjectId
  is_read: boolean
  created_at: Date
  updated_at: Date
}

const notificationSchema = new Schema<INotification>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["business_status","user_status", "share_request", "share_approved", "document_uploaded", "internal_message","intake_status","review_status"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    related_id: { type: Schema.Types.ObjectId },
    is_read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

notificationSchema.index({ user_id: 1, created_at: -1 })
notificationSchema.index({ user_id: 1, is_read: 1 })

const Notification = mongoose.model<INotification>("Notification", notificationSchema)
export default Notification
