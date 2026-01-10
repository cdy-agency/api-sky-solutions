import { Router, type Request, type Response } from "express"
import { protect, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import cloudinary from "../config/cloudinary"
import LibraryFolder from "../models/LibraryFolder"
import LibraryDocument from "../models/LibraryDocument"
import fs from "fs"
import { uploadToCloudinary, deleteFromCloudinary, getOptimizedUrl } from "../config/cloudinary"

const router = Router()

// ===== FOLDER OPERATIONS =====

// Create folder (with optional parent_id for subfolders)
router.post("/folders", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, parent_id } = req.body

    if (!name) {
      res.status(400).json({ message: "Folder name required" })
      return
    }

    // Check if folder with same name exists in same parent
    const existingFolder = await LibraryFolder.findOne({
      name,
      parent_id: parent_id || null,
    })
    if (existingFolder) {
      res.status(400).json({ message: "Folder with this name already exists in this location" })
      return
    }

    // Validate parent exists if provided
    if (parent_id) {
      const parent = await LibraryFolder.findById(parent_id)
      if (!parent) {
        res.status(404).json({ message: "Parent folder not found" })
        return
      }
    }

    const folder = await LibraryFolder.create({
      name,
      description,
      parent_id: parent_id || null,
    })
    res.status(201).json(folder)
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Folder with this name already exists in this location" })
      return
    }
    res.status(500).json({ message: error.message })
  }
})

// Get folders (with optional parent_id filter for subfolders)
router.get("/folders", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { parent_id, sort = "name" } = req.query

    const query: any = {}
    if (parent_id === "null" || parent_id === null || !parent_id) {
      query.parent_id = null
    } else {
      query.parent_id = parent_id
    }

    let sortOption: any = {}
    switch (sort) {
      case "name":
        sortOption = { name: 1 }
        break
      case "date":
        sortOption = { created_at: -1 }
        break
      default:
        sortOption = { name: 1 }
    }

    const folders = await LibraryFolder.find(query).sort(sortOption)
    res.json(folders)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get single folder
router.get("/folders/:folderId", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params
    const folder = await LibraryFolder.findById(folderId)
    if (!folder) {
      res.status(404).json({ message: "Folder not found" })
      return
    }
    res.json(folder)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Rename folder
router.patch("/folders/:folderId/rename", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params
    const { name } = req.body

    if (!name) {
      res.status(400).json({ message: "Folder name required" })
      return
    }

    const folder = await LibraryFolder.findById(folderId)
    if (!folder) {
      res.status(404).json({ message: "Folder not found" })
      return
    }

    // Check if folder with same name exists in same parent
    const existingFolder = await LibraryFolder.findOne({
      name,
      parent_id: folder.parent_id || null,
      _id: { $ne: folderId },
    })
    if (existingFolder) {
      res.status(400).json({ message: "Folder with this name already exists in this location" })
      return
    }

    folder.name = name
    await folder.save()

    res.json(folder)
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Folder with this name already exists in this location" })
      return
    }
    res.status(500).json({ message: error.message })
  }
})

// Move folder
router.patch("/folders/:folderId/move", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params
    const { parent_id } = req.body

    const folder = await LibraryFolder.findById(folderId)
    if (!folder) {
      res.status(404).json({ message: "Folder not found" })
      return
    }

    // Prevent moving folder into itself or its descendants
    if (parent_id) {
      const newParent = await LibraryFolder.findById(parent_id)
      if (!newParent) {
        res.status(404).json({ message: "Target parent folder not found" })
        return
      }

      // Check if trying to move into a descendant
      let currentParent: any = newParent
      while (currentParent) {
        if (currentParent._id.toString() === folderId) {
          res.status(400).json({ message: "Cannot move folder into its own descendant" })
          return
        }
        currentParent = currentParent.parent_id
          ? await LibraryFolder.findById(currentParent.parent_id)
          : null
      }

      // Check if folder with same name exists in target parent
      const existingFolder = await LibraryFolder.findOne({
        name: folder.name,
        parent_id: parent_id,
        _id: { $ne: folderId },
      })
      if (existingFolder) {
        res.status(400).json({ message: "Folder with this name already exists in target location" })
        return
      }
    }

    folder.parent_id = parent_id || null
    await folder.save()

    res.json(folder)
  } catch (error: any) {
    if (error.code === 11000) {
      res.status(400).json({ message: "Folder with this name already exists in target location" })
      return
    }
    res.status(500).json({ message: error.message })
  }
})

// Delete folder
router.delete("/folders/:folderId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params

    const folder = await LibraryFolder.findById(folderId)
    if (!folder) {
      res.status(404).json({ message: "Folder not found" })
      return
    }

    // Check for subfolders
    const subfolders = await LibraryFolder.countDocuments({ parent_id: folderId })
    if (subfolders > 0) {
      res.status(400).json({ message: "Cannot delete folder with subfolders. Please delete or move subfolders first." })
      return
    }

    // Check for documents
    const documents = await LibraryDocument.countDocuments({ folder_id: folderId })
    if (documents > 0) {
      res.status(400).json({ message: "Cannot delete folder with documents. Please delete or move documents first." })
      return
    }

    await LibraryFolder.findByIdAndDelete(folderId)
    res.json({ message: "Folder deleted successfully" })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// ===== DOCUMENT OPERATIONS =====

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

    // Verify folder exists
    const folder = await LibraryFolder.findById(folder_id)
    if (!folder) {
      res.status(404).json({ message: "Folder not found" })
      return
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, "library", req.file.mimetype.startsWith("image/") ? "image" : "raw")

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

// Get documents by folder (with sorting)
router.get("/documents/:folderId", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { folderId } = req.params
    const page = Number.parseInt(req.query.page as string) || 1
    const limit = Number.parseInt(req.query.limit as string) || 10
    const sort = (req.query.sort as string) || "date"

    let sortOption: any = {}
    switch (sort) {
      case "name":
        sortOption = { file_name: 1 }
        break
      case "date":
        sortOption = { created_at: -1 }
        break
      case "size":
        sortOption = { file_size: -1 }
        break
      case "type":
        sortOption = { file_type: 1 }
        break
      default:
        sortOption = { created_at: -1 }
    }

    const documents = await LibraryDocument.find({ folder_id: folderId })
      .populate("uploaded_by_id", "name email")
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)

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

// Get single document (with view URL)
router.get("/documents/:documentId", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params
    const document = await LibraryDocument.findById(documentId).populate("uploaded_by_id", "name email")
    if (!document) {
      res.status(404).json({ message: "Document not found" })
      return
    }
    
    // Add optimized view URL for images and PDFs
    const resourceType = document.file_type.startsWith("image/") ? "image" : "raw"
    let viewUrl = document.file_url

    if (document.public_id) {
      try {
        if (resourceType === "image") {
          viewUrl = getOptimizedUrl(document.public_id, "image")
        } else if (document.file_type === "application/pdf") {
          // For PDFs, use Cloudinary URL with proper settings for viewing
          viewUrl = cloudinary.url(document.public_id, {
            secure: true,
            resource_type: "raw",
            format: "pdf",
          })
        }
      } catch (error) {
        console.error("Error generating view URL:", error)
        // Fallback to original URL
      }
    }

    res.json({
      ...document.toObject(),
      view_url: viewUrl,
      can_view_in_app: document.file_type.startsWith("image/") || document.file_type === "application/pdf" || document.file_type.startsWith("text/"),
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Rename document
router.patch("/documents/:documentId/rename", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params
    const { file_name } = req.body

    if (!file_name) {
      res.status(400).json({ message: "File name required" })
      return
    }

    const document = await LibraryDocument.findById(documentId)
    if (!document) {
      res.status(404).json({ message: "Document not found" })
      return
    }

    document.file_name = file_name
    await document.save()

    res.json(document)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Move document
router.patch("/documents/:documentId/move", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params
    const { folder_id } = req.body

    if (!folder_id) {
      res.status(400).json({ message: "Target folder ID required" })
      return
    }

    const document = await LibraryDocument.findById(documentId)
    if (!document) {
      res.status(404).json({ message: "Document not found" })
      return
    }

    const folder = await LibraryFolder.findById(folder_id)
    if (!folder) {
      res.status(404).json({ message: "Target folder not found" })
      return
    }

    document.folder_id = folder_id
    await document.save()

    res.json(document)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Download document (returns optimized file URL with proper download headers)
router.get("/documents/:documentId/download", protect, async (req: Request, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params
    const document = await LibraryDocument.findById(documentId)
    if (!document) {
      res.status(404).json({ message: "Document not found" })
      return
    }

    // Generate optimized download URL from Cloudinary with attachment flag for download
    const resourceType = document.file_type.startsWith("image/") ? "image" : "raw"
    let downloadUrl = document.file_url
    let viewUrl = document.file_url
    
    if (document.public_id) {
      try {
        if (resourceType === "image") {
          downloadUrl = cloudinary.url(document.public_id, {
            secure: true,
            fetch_format: "auto",
            quality: "auto",
            flags: "attachment",
          })
        } else if (document.file_type === "application/pdf") {
          // For PDFs, ensure proper download handling
          downloadUrl = cloudinary.url(document.public_id, {
            secure: true,
            resource_type: "raw",
            format: "pdf",
            flags: "attachment",
          })
          // View URL for PDFs (without attachment flag for viewing)
          viewUrl = cloudinary.url(document.public_id, {
            secure: true,
            resource_type: "raw",
            format: "pdf",
          })
        } else {
          downloadUrl = cloudinary.url(document.public_id, {
            secure: true,
            resource_type: resourceType,
            flags: "attachment",
          })
        }
      } catch (error) {
        // Fallback to original URL if Cloudinary transformation fails
        console.error("Cloudinary URL generation error:", error)
      }
    }

    res.json({
      download_url: downloadUrl,
      view_url: viewUrl,
      file_name: document.file_name,
      file_type: document.file_type,
      file_size: document.file_size,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete document
router.delete("/documents/:documentId", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params

    const document = await LibraryDocument.findById(documentId)
    if (!document) {
      res.status(404).json({ message: "Document not found" })
      return
    }

    // Delete from Cloudinary
    if (document.public_id) {
      await deleteFromCloudinary(document.public_id)
    }

    await LibraryDocument.findByIdAndDelete(documentId)

    res.json({ message: "Document deleted successfully" })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

export default router
