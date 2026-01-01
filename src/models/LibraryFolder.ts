import mongoose, { type Document, Schema } from "mongoose"

export interface ILibraryFolder extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description?: string
  created_at: Date
  updated_at: Date
}

const libraryFolderSchema = new Schema<ILibraryFolder>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

libraryFolderSchema.index({ name: 1 })

const LibraryFolder = mongoose.model<ILibraryFolder>("LibraryFolder", libraryFolderSchema)
export default LibraryFolder
