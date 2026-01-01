import mongoose, { type Document, Schema } from "mongoose"

export interface ILibraryDocument extends Document {
  _id: mongoose.Types.ObjectId
  folder_id: mongoose.Types.ObjectId
  file_name: string
  file_type: string
  file_size: number
  file_url: string
  public_id: string
  uploaded_by_id: mongoose.Types.ObjectId
  uploaded_by_role: "admin" | "entrepreneur" | "investor"
  related_user_id?: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
}

const libraryDocumentSchema = new Schema<ILibraryDocument>(
  {
    folder_id: {
      type: Schema.Types.ObjectId,
      ref: "LibraryFolder",
      required: true,
    },
    file_name: { type: String, required: true, trim: true },
    file_type: { type: String, required: true },
    file_size: { type: Number, required: true },
    file_url: { type: String, required: true },
    public_id: { type: String, required: true },
    uploaded_by_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    uploaded_by_role: {
      type: String,
      enum: ["admin", "entrepreneur", "investor"],
      required: true,
    },
    related_user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

libraryDocumentSchema.index({ folder_id: 1 })
libraryDocumentSchema.index({ uploaded_by_id: 1 })
libraryDocumentSchema.index({ related_user_id: 1 })
libraryDocumentSchema.index({ created_at: -1 })

const LibraryDocument = mongoose.model<ILibraryDocument>("LibraryDocument", libraryDocumentSchema)
export default LibraryDocument
