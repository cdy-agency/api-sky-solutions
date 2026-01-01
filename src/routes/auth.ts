import { Router, type Response } from "express"
import jwt from "jsonwebtoken"
import crypto from "crypto"
import User from "../models/User"
import { sendVerificationEmail } from "../config/email"
import { protect, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary } from "../config/cloudinary"
import LibraryFolder from "../models/LibraryFolder"
import LibraryDocument from "../models/LibraryDocument"

const router = Router()

// Register
router.post("/register", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, phone, email, location, password, role, terms_accepted } = req.body

    if (!terms_accepted) {
      res.status(400).json({ message: "You must accept terms and policy" })
      return
    }

    if (!["entrepreneur", "investor"].includes(role)) {
      res.status(400).json({ message: "Invalid role" })
      return
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      res.status(400).json({ message: "User already exists" })
      return
    }

    const verification_token = crypto.randomBytes(32).toString("hex")
    const verification_token_expires = new Date(Date.now() + 24 * 60 * 60 * 1000)

    const user = await User.create({
      name,
      phone,
      email,
      location,
      password,
      role,
      terms_accepted,
      terms_accepted_at: new Date(),
      verification_token,
      verification_token_expires,
    })

    await sendVerificationEmail(email, verification_token)

    res.status(201).json({
      message: "Registration successful. Please check your email to verify your account.",
      userId: user._id,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Verify Email
router.get("/verify/:token", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { token } = req.params

    const user = await User.findOne({
      verification_token: token,
      verification_token_expires: { $gt: new Date() },
    })

    if (!user) {
      res.status(400).json({ message: "Invalid or expired verification token" })
      return
    }

    user.is_active = true
    user.verification_token = undefined
    user.verification_token_expires = undefined
    await user.save()

    res.json({ message: "Email verified successfully. You can now login." })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Login
router.post("/login", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) {
      res.status(401).json({ message: "Invalid credentials" })
      return
    }

    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      res.status(401).json({ message: "Invalid credentials" })
      return
    }

    if (!user.is_active && user.role !== "admin") {
      res.status(401).json({ message: "Please verify your email first" })
      return
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" })

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        intake_completed: user.intake_completed,
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Profile Update
router.put("/profile", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id
    const { name, phone, email, location, avatar_url } = req.body

    const user = await User.findByIdAndUpdate(
      userId,
      { name, phone, email, location, avatar_url, updated_at: new Date() },
      { new: true },
    )

    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        avatar_url: user.avatar_url,
        role: user.role,
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// GET /auth/profile endpoint
router.get("/profile", protect, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id

    const user = await User.findById(userId).select("-password -verification_token")

    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        location: user.location,
        avatar_url: user.avatar_url,
        role: user.role,
        is_active: user.is_active,
        intake_completed: user.intake_completed,
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Document Submission
router.post(
  "/submit-documents",
  protect,
  upload.single("document"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?._id
      const userRole = req.user?.role
      const { document_type } = req.body

      if (!req.file) {
        res.status(400).json({ message: "Document file required" })
        return
      }

      const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
      if (req.file.size > MAX_FILE_SIZE) {
        res.status(400).json({ message: "File size exceeds 5MB limit" })
        return
      }

      // Upload to Cloudinary
      const result = await uploadToCloudinary(
        req.file.buffer,
        `documents/${userRole}`,
        req.file.mimetype.startsWith("image/") ? "image" : "raw"
      )

      // Determine folder based on user role
      const folderName = userRole === "entrepreneur" ? "Entrepreneur Documents" : "Investor Documents"
      let folder = await LibraryFolder.findOne({ name: folderName })

      if (!folder) {
        folder = await LibraryFolder.create({ name: folderName, description: `Submitted by ${userRole}s` })
      }

      const document = await LibraryDocument.create({
        folder_id: folder._id,
        file_name: req.file.originalname,
        file_type: req.file.mimetype,
        file_size: req.file.size,
        file_url: result.url,
        public_id: result.publicId,
        uploaded_by_id: userId,
        uploaded_by_role: userRole,
        related_user_id: userId,
        document_type,
      })

      res.status(201).json({ message: "Document submitted successfully", document })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

export default router
