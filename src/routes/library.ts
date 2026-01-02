import { Router, type Response } from "express"
import { protect, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary"
import LibraryFolder from "../models/LibraryFolder"
import LibraryDocument from "../models/LibraryDocument"

const router = Router()

// Create folder
router.post("/folders", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body

    if (!name) {
      res.status(400).json({ message: "Folder name required" })
      return
    }

    const existingFolder = await LibraryFolder.findOne({ name })
    if (existingFolder) {
      res.status(400).json({ message: "Folder already exists" })
      return
    }

    const folder = await LibraryFolder.create({ name, description })
    res.status(201).json(folder)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get all folders
router.get("/folders", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const folders = await LibraryFolder.find()
    res.json(folders)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Upload document
router.post("/upload", protect, upload.single("file"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folder_id, related_user_id } = req.body
    const userId = req.user?._id
    const userRole = req.user?.role

    if (!req.file || !folder_id) {
      res.status(400).json({ message: "File and folder required" })
      return
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(
      req.file.buffer,
      "library",
      req.file.mimetype.startsWith("image/") ? "image" : "raw"
    )

    const document = await LibraryDocument.create({
      folder_id,
      file_name: req.file.originalname,
      file_type: req.file.mimetype,
      file_size: req.file.size,
      file_url: result.url,
      public_id: result.publicId,
      uploaded_by_id: userId,
      uploaded_by_role: userRole,
      related_user_id: related_user_id || null,
    })

    res.status(201).json(document)
  } catch (error: any) {
   res.status(500).json({ message: error.message })
  }
})

// Get documents by folder
router.get("/documents/:folderId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params
    const page = Number.parseInt(req.query.page as string) || 1
    const limit = Number.parseInt(req.query.limit as string) || 10

    const documents = await LibraryDocument.find({ folder_id: folderId })
      .populate("uploaded_by_id", "name email")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created_at: -1 })

    const total = await LibraryDocument.countDocuments({ folder_id: folderId })

    res.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete document
router.delete("/:documentId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params

    const document = await LibraryDocument.findByIdAndDelete(documentId)
    if (!document) {
      res.status(404).json({ message: "Document not found" })
      return
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(document.public_id)

    res.json({ message: "Document deleted" })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
