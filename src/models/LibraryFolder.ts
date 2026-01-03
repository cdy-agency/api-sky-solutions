import mongoose, { type Document, Schema } from "mongoose"

export interface ILibraryFolder extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  description?: string
  parent_id?: mongoose.Types.ObjectId
  created_at: Date
  updated_at: Date
}

const libraryFolderSchema = new Schema<ILibraryFolder>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String },
    parent_id: {
      type: Schema.Types.ObjectId,
      ref: "LibraryFolder",
      default: null,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
)

// Compound index for unique folder names within same parent
libraryFolderSchema.index({ name: 1, parent_id: 1 }, { unique: true })
libraryFolderSchema.index({ parent_id: 1 })
libraryFolderSchema.index({ created_at: -1 })

const LibraryFolder = mongoose.model<ILibraryFolder>("LibraryFolder", libraryFolderSchema)
export default LibraryFolder
