import mongoose, { type Document, Schema } from "mongoose"

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description?: string
  registration_fee: number
  created_at: Date
  updated_at: Date
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    registration_fee: { type: Number, required: true, min: 0 },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

const Category = mongoose.model<ICategory>("Category", categorySchema)
export default Category
