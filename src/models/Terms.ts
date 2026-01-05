import mongoose, { type Document, Schema } from "mongoose"

export interface ITerms extends Document {
  _id: mongoose.Types.ObjectId
  general: string
  entrepreneur: string
  investor: string
  created_at: Date
  updated_at: Date
}

const termsSchema = new Schema<ITerms>(
  {
    general: { type: String, required: true, default: "" },
    entrepreneur: { type: String, required: true, default: "" },
    investor: { type: String, required: true, default: "" },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)


const Terms = mongoose.model<ITerms>("Terms", termsSchema)
export default Terms

