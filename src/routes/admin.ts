import { Router, type Response } from "express"
import Business from "../models/Business"
import Category from "../models/Category"
import User from "../models/User"
import Notification from "../models/Notification"
import Investment from "../models/Investment"
import IntakeSubmission from "../models/IntakeSubmission" // Added import for IntakeSubmission
import { protect, authorize, type AuthRequest } from "../middleware/auth"
import { upload } from "../middleware/upload"
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary"
import type { Express } from "express"
import { sendCustomEmail } from "../config/email" // Added import for sendCustomEmail

const router = Router()

// ===== CATEGORY MANAGEMENT =====

// Get all categories
router.get("/categories", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await Category.find().sort({ name: 1 })
    res.json(categories)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create category
router.post("/categories", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, registration_fee } = req.body

    if (!name || registration_fee === undefined) {
      res.status(400).json({ message: "Name and registration fee are required" })
      return
    }

    const existingCategory = await Category.findOne({ name })
    if (existingCategory) {
      res.status(400).json({ message: "Category already exists" })
      return
    }

    const category = await Category.create({
      name,
      description,
      registration_fee: Number.parseFloat(registration_fee),
    })

    res.status(201).json(category)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update category
router.put("/categories/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, registration_fee } = req.body
    const category = await Category.findById(req.params.id)

    if (!category) {
      res.status(404).json({ message: "Category not found" })
      return
    }

    if (name) category.name = name
    if (description !== undefined) category.description = description
    if (registration_fee !== undefined) category.registration_fee = Number.parseFloat(registration_fee)

    await category.save()
    res.json(category)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete category
router.delete(
  "/categories/:id",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const category = await Category.findById(req.params.id)

      if (!category) {
        res.status(404).json({ message: "Category not found" })
        return
      }

      await category.deleteOne()
      res.json({ message: "Category deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== BUSINESS MANAGEMENT =====

// ===== PUBLIC BUSINESS MANAGEMENT (Must come before /businesses/:id) =====

// Get all public businesses (admin view)
router.get("/businesses/public", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page, limit } = req.query
    const pageNum = Number.parseInt(page as string) || 1
    const limitNum = Number.parseInt(limit as string) || 10

    const filter: any = { type: "public" }

    const businesses = await Business.find(filter)
      .populate("category_id", "name registration_fee")
      .populate("entrepreneur_id", "name email phone")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ created_at: -1 })

    const total = await Business.countDocuments(filter)

    res.json({
      businesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Create public business directly
router.post(
  "/businesses/public",
  protect,
  authorize("admin"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { title, category_id, description, total_shares, share_value, minimum_shares_per_request } = req.body
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }

      if (!title || !category_id || !description || !total_shares || !share_value) {
        res.status(400).json({ message: "Title, category, description, total shares, and share value are required" })
        return
      }

      // Validate shares
      if (!Number.isInteger(Number(total_shares)) || Number(total_shares) <= 0) {
        res.status(400).json({ message: "Total shares must be a positive integer" })
        return
      }

      if (Number(share_value) <= 0) {
        res.status(400).json({ message: "Share value must be positive" })
        return
      }

      let image_url: string | undefined
      let image_public_id: string | undefined
      let pdf_url: string | undefined
      let pdf_public_id: string | undefined

      if (files?.image?.[0]) {
        const imageResult = await uploadToCloudinary(files.image[0].buffer, "sky-solutions/images", "image")
        image_url = imageResult.url
        image_public_id = imageResult.publicId
      }

      if (files?.pdf?.[0]) {
        const pdfResult = await uploadToCloudinary(files.pdf[0].buffer, "sky-solutions/pdfs", "raw")
        pdf_url = pdfResult.url
        pdf_public_id = pdfResult.publicId
      }

      const publicBusiness = await Business.create({
        title,
        category_id,
        description,
        image_url,
        image_public_id,
        pdf_url,
        pdf_public_id,
        total_shares: Number.parseInt(total_shares as string),
        remaining_shares: Number.parseInt(total_shares as string),
        share_value: Number.parseFloat(share_value as string),
        minimum_shares_per_request: minimum_shares_per_request
          ? Number.parseInt(minimum_shares_per_request as string)
          : 1,
        status: "active",
        type: "public",
      })

      res.status(201).json(publicBusiness)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Update public business
router.put(
  "/businesses/public/:id",
  protect,
  authorize("admin"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findById(req.params.id)

      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }

      if (business.type !== "public") {
        res.status(400).json({ message: "Can only update public listings" })
        return
      }

      const { title, category_id, description, total_shares, share_value, minimum_shares_per_request, status } =
        req.body
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }

      if (files?.image?.[0]) {
        if (business.image_public_id) {
          await deleteFromCloudinary(business.image_public_id)
        }
        const imageResult = await uploadToCloudinary(files.image[0].buffer, "sky-solutions/images", "image")
        business.image_url = imageResult.url
        business.image_public_id = imageResult.publicId
      }

      if (files?.pdf?.[0]) {
        if (business.pdf_public_id) {
          await deleteFromCloudinary(business.pdf_public_id)
        }
        const pdfResult = await uploadToCloudinary(files.pdf[0].buffer, "sky-solutions/pdfs", "raw")
        business.pdf_url = pdfResult.url
        business.pdf_public_id = pdfResult.publicId
      }

      if (title) business.title = title
      if (category_id) business.category_id = category_id
      if (description) business.description = description
      if (total_shares) {
        const newTotalShares = Number.parseInt(total_shares as string)
        business.total_shares = newTotalShares
        // Update remaining shares proportionally
        if (business.total_shares > 0) {
          const ratio = newTotalShares / business.total_shares
          business.remaining_shares = Math.floor(business.remaining_shares * ratio)
        } else {
          business.remaining_shares = newTotalShares
        }
      }
      if (share_value) business.share_value = Number.parseFloat(share_value as string)
      if (minimum_shares_per_request)
        business.minimum_shares_per_request = Number.parseInt(minimum_shares_per_request as string)
      if (status) business.status = status

      await business.save()
      res.json(business)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get all pending business submissions
router.get("/businesses", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, status, page, limit } = req.query
    const pageNum = Number.parseInt(page as string) || 1
    const limitNum = Number.parseInt(limit as string) || 10

    const filter: any = { type: type || "submission" }

    if (status) {
      filter.status = status
    }

    const businesses = await Business.find(filter)
      .populate("entrepreneur_id", "name email phone")
      .populate("category_id", "name registration_fee")
      .populate("submission_id")
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ created_at: -1 })

    const total = await Business.countDocuments(filter)

    res.json({
      businesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get business details
router.get("/businesses/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const business = await Business.findById(req.params.id)
      .populate("entrepreneur_id", "name email phone")
      .populate("category_id")
      .populate("submission_id")

    if (!business) {
      res.status(404).json({ message: "Business not found" })
      return
    }

    res.json(business)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

router.post(
  "/businesses/:id/approve",
  protect,
  authorize("admin"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const submission = await Business.findById(req.params.id)

      if (!submission) {
        res.status(404).json({ message: "Submission not found" })
        return
      }

      if (submission.type !== "submission" || submission.status !== "pending") {
        res.status(400).json({ message: "Can only approve pending submissions" })
        return
      }

      const { description, total_shares, share_value, minimum_shares_per_request } = req.body
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }

      if (!description || !total_shares || !share_value) {
        res.status(400).json({ message: "Description, total shares, and share value are required" })
        return
      }

      // Validate shares
      if (!Number.isInteger(Number(total_shares)) || Number(total_shares) <= 0) {
        res.status(400).json({ message: "Total shares must be a positive integer" })
        return
      }

      if (Number(share_value) <= 0) {
        res.status(400).json({ message: "Share value must be positive" })
        return
      }

      let image_url: string | undefined
      let image_public_id: string | undefined
      let pdf_url: string | undefined
      let pdf_public_id: string | undefined

      if (files?.image?.[0]) {
        const imageResult = await uploadToCloudinary(files.image[0].buffer, "sky-solutions/images", "image")
        image_url = imageResult.url
        image_public_id = imageResult.publicId
      }

      if (files?.pdf?.[0]) {
        const pdfResult = await uploadToCloudinary(files.pdf[0].buffer, "sky-solutions/pdfs", "raw")
        pdf_url = pdfResult.url
        pdf_public_id = pdfResult.publicId
      }

      // Update submission status to approved
      submission.status = "approved"
      await submission.save()

      // Create a new public listing with shares
      const publicBusiness = await Business.create({
        entrepreneur_id: submission.entrepreneur_id,
        title: submission.title,
        category_id: submission.category_id,
        description,
        image_url,
        image_public_id,
        pdf_url,
        pdf_public_id,
        total_shares: Number.parseInt(total_shares as string),
        remaining_shares: Number.parseInt(total_shares as string),
        share_value: Number.parseFloat(share_value as string),
        minimum_shares_per_request: minimum_shares_per_request
          ? Number.parseInt(minimum_shares_per_request as string)
          : 1,
        status: "active",
        type: "public",
        submission_id: submission._id,
      })

      // Create notification for entrepreneur
      await Notification.create({
        user_id: submission.entrepreneur_id,
        type: "business_status",
        title: "Business Approved",
        message: `Your business "${submission.title}" has been approved and is now live for investors!`,
        related_id: publicBusiness._id,
      })

      res.json(publicBusiness)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.post(
  "/businesses/:id/reject",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { rejection_reason } = req.body
      const submission = await Business.findById(req.params.id)

      if (!submission) {
        res.status(404).json({ message: "Submission not found" })
        return
      }

      if (submission.type !== "submission" || submission.status !== "pending") {
        res.status(400).json({ message: "Can only reject pending submissions" })
        return
      }

      submission.status = "rejected"
      submission.rejection_reason = rejection_reason || "Application rejected by admin"

      // Delete business plan from Cloudinary
      if (submission.business_plan_public_id) {
        await deleteFromCloudinary(submission.business_plan_public_id)
      }

      await submission.save()

      // Create notification for entrepreneur
      await Notification.create({
        user_id: submission.entrepreneur_id,
        type: "business_status",
        title: "Business Application Rejected",
        message: `Your business application has been rejected. Reason: ${rejection_reason}`,
        related_id: submission._id,
      })

      res.json(submission)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

router.put(
  "/businesses/:id",
  protect,
  authorize("admin"),
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "pdf", maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findById(req.params.id)

      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }

      if (business.type !== "public") {
        res.status(400).json({ message: "Can only update public listings" })
        return
      }

      const { title, category_id, description, total_shares, share_value, minimum_shares_per_request, status } =
        req.body
      const files = req.files as { [fieldname: string]: Express.Multer.File[] }

      if (files?.image?.[0]) {
        if (business.image_public_id) {
          await deleteFromCloudinary(business.image_public_id)
        }
        const imageResult = await uploadToCloudinary(files.image[0].buffer, "sky-solutions/images", "image")
        business.image_url = imageResult.url
        business.image_public_id = imageResult.publicId
      }

      if (files?.pdf?.[0]) {
        if (business.pdf_public_id) {
          await deleteFromCloudinary(business.pdf_public_id)
        }
        const pdfResult = await uploadToCloudinary(files.pdf[0].buffer, "sky-solutions/pdfs", "raw")
        business.pdf_url = pdfResult.url
        business.pdf_public_id = pdfResult.publicId
      }

      if (title) business.title = title
      if (category_id) business.category_id = category_id
      if (description) business.description = description
      if (total_shares) business.total_shares = Number.parseInt(total_shares as string)
      if (share_value) business.share_value = Number.parseFloat(share_value as string)
      if (minimum_shares_per_request)
        business.minimum_shares_per_request = Number.parseInt(minimum_shares_per_request as string)
      if (status) business.status = status

      await business.save()
      res.json(business)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Delete business
router.delete(
  "/businesses/:id",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const business = await Business.findById(req.params.id)

      if (!business) {
        res.status(404).json({ message: "Business not found" })
        return
      }

      if (business.image_public_id) {
        await deleteFromCloudinary(business.image_public_id)
      }
      if (business.pdf_public_id) {
        await deleteFromCloudinary(business.pdf_public_id)
      }

      await business.deleteOne()
      res.json({ message: "Business deleted successfully" })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)


// ===== USER MANAGEMENT =====

// Get all users
router.get("/users", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, is_active } = req.query
    const filter: any = {}

    if (role) filter.role = role
    if (is_active !== undefined) filter.is_active = is_active === "true"

    const users = await User.find(filter)
      .select("-password -verification_token -verification_token_expires")
      .sort({ created_at: -1 })

    res.json(users)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Delete user
router.delete("/users/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id)

    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    if (user.role === "admin") {
      res.status(400).json({ message: "Cannot delete admin user" })
      return
    }

    await user.deleteOne()
    res.json({ message: "User deleted successfully" })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update user status
router.patch(
  "/users/:id/status",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { is_active } = req.body
      const user = await User.findById(req.params.id)

      if (!user) {
        res.status(404).json({ message: "User not found" })
        return
      }

      user.is_active = is_active
      await user.save()

      res.json({ message: `User ${is_active ? "activated" : "deactivated"} successfully` })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// Get user with their intake information
router.get(
  "/users/:id/profile",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.params.id).select(
        "-password -verification_token -verification_token_expires",
      )

      if (!user) {
        res.status(404).json({ message: "User not found" })
        return
      }

      const intake = await IntakeSubmission.findOne({ user_id: user._id })

      res.json({ user, intake })
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== INVESTMENT MANAGEMENT =====

// Get all investments
router.get("/investments", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const investments = await Investment.find()
      .populate("investor_id", "name email")
      .populate("business_id", "title category")
      .sort({ created_at: -1 })

    res.json(investments)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get single investment
router.get("/investments/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const investment = await Investment.findById(req.params.id)
      .populate("investor_id", "name email phone")
      .populate("business_id", "title category description entrepreneur_id")

    if (!investment) {
      res.status(404).json({ message: "Investment not found" })
      return
    }

    res.json(investment)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update investment status
router.patch(
  "/investments/:id/status",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status } = req.body
      const investment = await Investment.findById(req.params.id)

      if (!investment) {
        res.status(404).json({ message: "Investment not found" })
        return
      }

      investment.status = status
      await investment.save()

      res.json(investment)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

// ===== DASHBOARD STATS =====

// Dashboard stats
router.get("/stats", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalBusinesses,
      totalInvestments,
      activeBusinesses,
      pendingInvestments,
      entrepreneurs,
      investors,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" } }),
      Business.countDocuments(),
      Investment.countDocuments(),
      Business.countDocuments({ status: "active" }),
      Investment.countDocuments({ status: "pending" }),
      User.countDocuments({ role: "entrepreneur" }),
      User.countDocuments({ role: "investor" }),
    ])

    const totalFundingRequested = await Business.aggregate([
      { $group: { _id: null, total: { $sum: "$needed_funds" } } },
    ])

    const totalInvestmentAmount = await Investment.aggregate([
      { $match: { status: "approved" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])

    res.json({
      totalUsers,
      totalBusinesses,
      totalInvestments,
      activeBusinesses,
      pendingInvestments,
      entrepreneurs,
      investors,
      totalFundingRequested: totalFundingRequested[0]?.total || 0,
      totalInvestmentAmount: totalInvestmentAmount[0]?.total || 0,
    })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Send email to users
router.post("/send-email", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { user_ids, subject, message } = req.body

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      res.status(400).json({ message: "User IDs array is required" })
      return
    }

    if (!subject || !message) {
      res.status(400).json({ message: "Subject and message are required" })
      return
    }

    const users = await User.find({ _id: { $in: user_ids } }).select("email name")

    if (users.length === 0) {
      res.status(404).json({ message: "No users found" })
      return
    }

    for (const user of users) {
      await sendCustomEmail(user.email, user.name, subject, message)
    }

    res.json({ message: `Email sent to ${users.length} user(s)` })
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})
router.get("/intakes", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submissions = await IntakeSubmission.find()
      .populate("user_id", "name email phone")
      .sort({ created_at: -1 })
    res.json(submissions)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Get single intake submission
router.get("/intakes/:id", protect, authorize("admin"), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const submission = await IntakeSubmission.findById(req.params.id).populate("user_id", "name email phone")

    if (!submission) {
      res.status(404).json({ message: "Intake submission not found" })
      return
    }

    res.json(submission)
  } catch (error: any) {
    res.status(500).json({ message: error.message })
  }
})

// Update intake submission status
router.patch(
  "/intakes/:id/status",
  protect,
  authorize("admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { status, rejection_reason } = req.body
      const submission = await IntakeSubmission.findById(req.params.id)

      if (!submission) {
        res.status(404).json({ message: "Intake submission not found" })
        return
      }

      if (!status) {
        res.status(400).json({ message: "Status is required" })
        return
      }

      const validStatuses = ["pending", "submitted", "under_review", "approved", "rejected"]
      if (!validStatuses.includes(status)) {
        res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` })
        return
      }

      submission.status = status
      if (status === "rejected" && rejection_reason) {
        submission.rejection_reason = rejection_reason
      } else if (status !== "rejected") {
        submission.rejection_reason = undefined
      }

      await submission.save()

      // Create notification for user
      await Notification.create({
        user_id: submission.user_id,
        type: "intake_status",
        title: `Intake Submission ${status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}`,
        message: `Your intake submission status has been updated to ${status.replace("_", " ")}.`,
        related_id: submission._id,
      })

      res.json(submission)
    } catch (error: any) {
      res.status(500).json({ message: error.message })
    }
  },
)

export default router
